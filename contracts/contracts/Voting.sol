// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Voting - 有截止時間與建立者資訊的是/否投票合約（前端可自訂截止時間）
/// @notice 任何人都可以建立議題，每個地址對每個議題限投一次
contract Voting {
    struct Topic {
        string title;      // 議題標題
        address creator;   // 建立者
        uint256 deadline;  // 截止時間（UNIX timestamp, 秒）
        uint256 yesCount;  // 贊成票數
        uint256 noCount;   // 反對票數
        bool exists;       // 議題是否存在
    }

    // 最長投票時間（避免有人傳一個超級大的數）這裡設 30 天
    uint256 public constant MAX_DURATION = 30 days;

    uint256 public nextTopicId;
    mapping(uint256 => Topic) public topics;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event TopicCreated(
        uint256 indexed topicId,
        string title,
        address indexed creator,
        uint256 deadline
    );

    event Voted(uint256 indexed topicId, address indexed voter, bool support);

    /// @notice 建立新議題，前端傳入「投票期間秒數」
    /// @param _title 議題標題
    /// @param _durationSeconds 投票期間（秒），例如 1 天 = 86400
    function createTopic(string memory _title, uint256 _durationSeconds)
        external
        returns (uint256 topicId)
    {
        require(bytes(_title).length > 0, "Title required");
        require(_durationSeconds > 0, "Duration must be > 0");
        require(_durationSeconds <= MAX_DURATION, "Duration too long");

        topicId = nextTopicId;
        nextTopicId += 1;

        uint256 _deadline = block.timestamp + _durationSeconds;

        topics[topicId] = Topic({
            title: _title,
            creator: msg.sender,
            deadline: _deadline,
            yesCount: 0,
            noCount: 0,
            exists: true
        });

        emit TopicCreated(topicId, _title, msg.sender, _deadline);
    }

    function vote(uint256 _topicId, bool support) external {
        Topic storage topic = topics[_topicId];
        require(topic.exists, "Topic not found");
        require(block.timestamp <= topic.deadline, "Voting period over");
        require(!hasVoted[_topicId][msg.sender], "Already voted");

        hasVoted[_topicId][msg.sender] = true;

        if (support) {
            topic.yesCount += 1;
        } else {
            topic.noCount += 1;
        }

        emit Voted(_topicId, msg.sender, support);
    }

    function getTopic(uint256 _topicId)
        external
        view
        returns (
            string memory title,
            address creator,
            uint256 deadline,
            uint256 yes,
            uint256 no
        )
    {
        Topic storage t = topics[_topicId];
        require(t.exists, "Topic not found");
        return (t.title, t.creator, t.deadline, t.yesCount, t.noCount);
    }

    function getAllTopics()
        external
        view
        returns (
            uint256[] memory ids,
            string[] memory titles,
            address[] memory creators,
            uint256[] memory deadlines,
            uint256[] memory yesCounts,
            uint256[] memory noCounts
        )
    {
        uint256 count = nextTopicId;

        ids = new uint256[](count);
        titles = new string[](count);
        creators = new address[](count);
        deadlines = new uint256[](count);
        yesCounts = new uint256[](count);
        noCounts = new uint256[](count);

        for (uint256 i = 0; i < count; i++) {
            Topic storage t = topics[i];
            if (!t.exists) {
                continue;
            }
            ids[i] = i;
            titles[i] = t.title;
            creators[i] = t.creator;
            deadlines[i] = t.deadline;
            yesCounts[i] = t.yesCount;
            noCounts[i] = t.noCount;
        }
    }
}
