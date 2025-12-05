// Auction contract configuration
export const AUCTION_CONTRACT_ADDRESS = '0x2362E03b277b3cbe9Bef684f11D9ABc92d8bdC86';

export const AUCTION_CONTRACT_ABI = [
  // events
  "event ItemCreated(uint256 indexed itemId, string name, address indexed seller, uint256 endTime)",
  "event HighestBidIncreased(uint256 indexed itemId, address indexed bidder, uint256 amount)",
  "event AuctionEnded(uint256 indexed itemId, address indexed winner, uint256 amount)",
  
  // read (view) functions
  "function nextItemId() view returns (uint256)",
  "function items(uint256) view returns (string name, address seller, uint256 endTime, address highestBidder, uint256 highestBid, bool ended, bool exists)",
  "function pendingReturns(uint256, address) view returns (uint256)",
  "function getItem(uint256 _itemId) view returns (string name, address seller, uint256 endTime, address highestBidder, uint256 highestBid, bool ended)",
  "function getAllItems() view returns (uint256[] ids, string[] names, address[] sellers, uint256[] endTimes, address[] highestBidders, uint256[] highestBids, bool[] endedList)",
  "function getActiveItems() view returns (uint256[] ids, string[] names, address[] sellers, uint256[] endTimes, address[] highestBidders, uint256[] highestBids)",
  "function canEndAuction(uint256 _itemId) view returns (bool)",
  "function getPendingReturn(uint256 _itemId, address _user) view returns (uint256)",
  
  // write (state-changing) functions
  "function createItem(string _name, uint256 _durationSeconds) returns (uint256 itemId)",
  "function bid(uint256 _itemId) payable",
  "function withdraw(uint256 _itemId)",
  "function endAuction(uint256 _itemId)",
  
  // constants
  "function MAX_DURATION() view returns (uint256)"
];