// Voting contract configuration
export const VOTING_CONTRACT_ADDRESS = '0x220d4cE11BB9Dd43E5AB8250E31005D64b3C629B';

export const VOTING_CONTRACT_ABI = [
  // events
  "event TopicCreated(uint256 indexed topicId, string title, address indexed creator, uint256 deadline)",
  "event Voted(uint256 indexed topicId, address indexed voter, bool support)",
  
  // read (view) functions
  "function nextTopicId() view returns (uint256)",
  "function topics(uint256) view returns (string title, address creator, uint256 deadline, uint256 yesCount, uint256 noCount, bool exists)",
  "function hasVoted(uint256, address) view returns (bool)",
  "function getTopic(uint256 _topicId) view returns (string title, address creator, uint256 deadline, uint256 yes, uint256 no)",
  "function getAllTopics() view returns (uint256[] ids, string[] titles, address[] creators, uint256[] deadlines, uint256[] yesCounts, uint256[] noCounts)",
  
  // write (state-changing) functions
  "function createTopic(string _title, uint256 _durationSeconds) returns (uint256 topicId)",
  "function vote(uint256 _topicId, bool support)",
  
  // constants
  "function MAX_DURATION() view returns (uint256)"
];