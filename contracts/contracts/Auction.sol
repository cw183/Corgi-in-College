// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Auction - 競標合約（多個商品，每個商品有最高出價者與截止時間）
/// @notice 任何人可以建立商品，大家可以用 ETH 出價，只有出價最高且在時間內者會贏
contract Auction {
    struct Item {
        string name;           // 商品名稱
        address seller;        // 賣家
        uint256 endTime;       // 截止時間（UNIX timestamp, 秒）
        address highestBidder; // 目前最高出價者
        uint256 highestBid;    // 目前最高出價（wei）
        bool ended;            // 是否已結束（已領錢）
        bool exists;           // 是否存在
    }

    uint256 public constant MAX_DURATION = 30 days;

    uint256 public nextItemId;
    mapping(uint256 => Item) public items;

    // itemId => (address => 可提領的退款金額)
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

    /// @notice 建立一個新的競標商品
    /// @param _name 商品名稱（例如：限量 NFT、神奇石頭）
    /// @param _durationSeconds 競標持續時間（秒），前端可自由設定，最多 30 天
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

    /// @notice 對某個商品出價（用 ETH）
    /// @dev 需要用 msg.value 送 ETH 進來，必須高於目前最高出價
    function bid(uint256 _itemId) external payable {
        Item storage item = items[_itemId];
        require(item.exists, "Item not found");
        require(block.timestamp < item.endTime, "Auction already ended");
        require(!item.ended, "Auction manually ended");
        require(msg.value > item.highestBid, "Bid not high enough");
        require(msg.value > 0, "Bid must be > 0");
        require(msg.sender != item.seller, "Seller cannot bid on own item");

        // 把前一個最高出價者的金額記錄到 pendingReturns
        if (item.highestBidder != address(0)) {
            pendingReturns[_itemId][item.highestBidder] += item.highestBid;
        }

        item.highestBidder = msg.sender;
        item.highestBid = msg.value;

        emit HighestBidIncreased(_itemId, msg.sender, msg.value);
    }

    /// @notice 讓沒得標的出價者提領退款
    function withdraw(uint256 _itemId) external {
        uint256 amount = pendingReturns[_itemId][msg.sender];
        require(amount > 0, "Nothing to withdraw");

        pendingReturns[_itemId][msg.sender] = 0;
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "Withdraw failed");
    }

    /// @notice 結束某個商品的競標，將款項轉給 seller
    /// @dev 任何人都可以呼叫，只要時間到了
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

    /// @notice 取得單一商品詳情
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

    /// @notice 拿回所有商品（給前端列表用，台上可以顯示「最新那個」）
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

    /// @notice 取得活躍的競標（未結束且未過期）
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
        // 先計算活躍競標數量
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

    /// @notice 檢查某個商品是否可以結束
    function canEndAuction(uint256 _itemId) external view returns (bool) {
        Item storage item = items[_itemId];
        return item.exists && !item.ended && block.timestamp >= item.endTime;
    }

    /// @notice 取得用戶在某個商品的待退款金額
    function getPendingReturn(uint256 _itemId, address _user) external view returns (uint256) {
        return pendingReturns[_itemId][_user];
    }
}
