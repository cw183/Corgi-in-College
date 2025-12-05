// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Voting - Yes/No voting contract with deadlines and creator info (frontend supplies deadline)
/// @notice Anyone can create topics; each address can vote once per topic
contract Voting {
    struct Topic {
        string title;      // topic title
        address creator;   // creator
        uint256 deadline;  // deadline (UNIX timestamp, seconds)
        uint256 yesCount;  // yes vote count
        uint256 noCount;   // no vote count
        bool exists;       // whether topic exists
    }

    // Maximum voting duration (prevent extremely large values); set to 30 days here
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

    /// @notice Create a new topic; frontend passes the voting duration in seconds
    /// @param _title Topic title
    /// @param _durationSeconds Voting duration in seconds (e.g. 1 day = 86400)
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
