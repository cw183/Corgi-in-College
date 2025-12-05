// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Auction - Auction contract (multiple items, each with a highest bidder and end time)
/// @notice Anyone can create items; people can bid with ETH, and the highest valid bidder wins
contract Auction {
    struct Item {
        string name;           // item name
        address seller;        // seller
        uint256 endTime;       // end time (UNIX timestamp, seconds)
        address highestBidder; // current highest bidder
        uint256 highestBid;    // current highest bid (wei)
        bool ended;            // whether ended (funds claimed)
        bool exists;           // whether exists
    }

    uint256 public constant MAX_DURATION = 30 days;

    uint256 public nextItemId;
    mapping(uint256 => Item) public items;

    // itemId => (address => refundable amount)
    mapping(uint256 => mapping(address => uint256)) public pendingReturns;

    event ItemCreated(
        uint256 indexed itemId,
        string name,
        address indexed seller,
        uint256 endTime
    );

    event HighestBidIncreased(
        uint256 indexed itemId,
        address indexed bidder,
        uint256 amount
    );

    event AuctionEnded(
        uint256 indexed itemId,
        address indexed winner,
        uint256 amount
    );

    /// @notice Create a new auction item
    /// @param _name Item name (e.g., limited NFT, magical stone)
    /// @param _durationSeconds Auction duration in seconds (frontend may set; max 30 days)
    function createItem(string memory _name, uint256 _durationSeconds)
        external
        returns (uint256 itemId)
    {
        require(bytes(_name).length > 0, "Name required");
        require(_durationSeconds > 0, "Duration must be > 0");
        require(_durationSeconds <= MAX_DURATION, "Duration too long");

        itemId = nextItemId;
        nextItemId += 1;

        uint256 endTime = block.timestamp + _durationSeconds;

        items[itemId] = Item({
            name: _name,
            seller: msg.sender,
            endTime: endTime,
            highestBidder: address(0),
            highestBid: 0,
            ended: false,
            exists: true
        });

        emit ItemCreated(itemId, _name, msg.sender, endTime);
    }

    /// @notice Place a bid on an item (with ETH)
    /// @dev Requires msg.value to be sent and must be higher than current highest bid
    function bid(uint256 _itemId) external payable {
        Item storage item = items[_itemId];
        require(item.exists, "Item not found");
        require(block.timestamp < item.endTime, "Auction already ended");
        require(!item.ended, "Auction manually ended");
        require(msg.value > item.highestBid, "Bid not high enough");
        require(msg.value > 0, "Bid must be > 0");
        require(msg.sender != item.seller, "Seller cannot bid on own item");

        // Record the previous highest bidder's amount into pendingReturns
        if (item.highestBidder != address(0)) {
            pendingReturns[_itemId][item.highestBidder] += item.highestBid;
        }

        item.highestBidder = msg.sender;
        item.highestBid = msg.value;

        emit HighestBidIncreased(_itemId, msg.sender, msg.value);
    }

    /// @notice Allow non-winning bidders to withdraw their refunds
    function withdraw(uint256 _itemId) external {
        uint256 amount = pendingReturns[_itemId][msg.sender];
        require(amount > 0, "Nothing to withdraw");

        pendingReturns[_itemId][msg.sender] = 0;
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "Withdraw failed");
    }

    /// @notice End an item's auction and transfer funds to the seller
    /// @dev Anyone can call once the end time has passed
    function endAuction(uint256 _itemId) external {
        Item storage item = items[_itemId];
        require(item.exists, "Item not found");
        require(!item.ended, "Auction already ended");
        require(block.timestamp >= item.endTime, "Auction not yet ended");

        item.ended = true;

        if (item.highestBid > 0) {
            (bool ok, ) = payable(item.seller).call{value: item.highestBid}("");
            require(ok, "Transfer to seller failed");
        }

        emit AuctionEnded(_itemId, item.highestBidder, item.highestBid);
    }

    /// @notice Get details for a single item
    function getItem(uint256 _itemId)
        external
        view
        returns (
            string memory name,
            address seller,
            uint256 endTime,
            address highestBidder,
            uint256 highestBid,
            bool ended
        )
    {
        Item storage item = items[_itemId];
        require(item.exists, "Item not found");
        return (
            item.name,
            item.seller,
            item.endTime,
            item.highestBidder,
            item.highestBid,
            item.ended
        );
    }

    /// @notice Retrieve all items (for frontend listing; UI can show the newest one)
    function getAllItems()
        external
        view
        returns (
            uint256[] memory ids,
            string[] memory names,
            address[] memory sellers,
            uint256[] memory endTimes,
            address[] memory highestBidders,
            uint256[] memory highestBids,
            bool[] memory endedList
        )
    {
        uint256 count = nextItemId;

        ids = new uint256[](count);
        names = new string[](count);
        sellers = new address[](count);
        endTimes = new uint256[](count);
        highestBidders = new address[](count);
        highestBids = new uint256[](count);
        endedList = new bool[](count);

        for (uint256 i = 0; i < count; i++) {
            Item storage item = items[i];
            if (!item.exists) {
                continue;
            }
            ids[i] = i;
            names[i] = item.name;
            sellers[i] = item.seller;
            endTimes[i] = item.endTime;
            highestBidders[i] = item.highestBidder;
            highestBids[i] = item.highestBid;
            endedList[i] = item.ended;
        }
    }

    /// @notice Get active auctions (not ended and not expired)
    function getActiveItems()
        external
        view
        returns (
            uint256[] memory ids,
            string[] memory names,
            address[] memory sellers,
            uint256[] memory endTimes,
            address[] memory highestBidders,
            uint256[] memory highestBids
        )
    {
        // First count active auctions
        uint256 activeCount = 0;
        for (uint256 i = 0; i < nextItemId; i++) {
            Item storage item = items[i];
            if (item.exists && !item.ended && block.timestamp < item.endTime) {
                activeCount++;
            }
        }

        ids = new uint256[](activeCount);
        names = new string[](activeCount);
        sellers = new address[](activeCount);
        endTimes = new uint256[](activeCount);
        highestBidders = new address[](activeCount);
        highestBids = new uint256[](activeCount);

        uint256 index = 0;
        for (uint256 i = 0; i < nextItemId; i++) {
            Item storage item = items[i];
            if (item.exists && !item.ended && block.timestamp < item.endTime) {
                ids[index] = i;
                names[index] = item.name;
                sellers[index] = item.seller;
                endTimes[index] = item.endTime;
                highestBidders[index] = item.highestBidder;
                highestBids[index] = item.highestBid;
                index++;
            }
        }
    }

    /// @notice Check whether an item can be ended
    function canEndAuction(uint256 _itemId) external view returns (bool) {
        Item storage item = items[_itemId];
        return item.exists && !item.ended && block.timestamp >= item.endTime;
    }

    /// @notice Get a user's pending refund amount for an item
    function getPendingReturn(uint256 _itemId, address _user) external view returns (uint256) {
        return pendingReturns[_itemId][_user];
    }
}
