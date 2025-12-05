'use client';

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { VOTING_CONTRACT_ADDRESS, VOTING_CONTRACT_ABI } from '../lib/voting';
import { AUCTION_CONTRACT_ADDRESS, AUCTION_CONTRACT_ABI } from '../lib/auction';

declare global {
  interface Window {
    ethereum?: any;
  }
}

type View = 'home' | 'vote' | 'auction';

export default function HomePage() {
  const [account, setAccount] = useState<string | null>(null);
  const [isSepolia, setIsSepolia] = useState<boolean>(false);
  const [view, setView] = useState<View>('home');
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);

  // Connect MetaMask
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert('Please install MetaMask first');
        return;
      }

      const _provider = new ethers.BrowserProvider(window.ethereum);
      setProvider(_provider);

      const accounts: string[] = await _provider.send('eth_requestAccounts', []);
      if (accounts.length > 0) {
        setAccount(accounts[0]);
      }
      const network = await _provider.getNetwork();
      const chainId = Number(network.chainId);
      if (chainId === 11155111) {
        setIsSepolia(true);
      } else {
        setIsSepolia(false);
        alert('Please switch to the Sepolia testnet before using this application');
      }
    } catch (err: any) {
      console.error(err);
      alert('Error connecting wallet: ' + (err?.message ?? 'Unknown error'));
    }
  };

  // Auto-detect if already connected + network
  useEffect(() => {
    const autoConnect = async () => {
      if (!window.ethereum) return;
      try {
        const _provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(_provider);

        const accounts: string[] = await _provider.send('eth_accounts', []);
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        }

        const network = await _provider.getNetwork();
        const chainId = Number(network.chainId);
        setIsSepolia(chainId === 11155111);

      } catch (e) {
        console.error(e);
      }
    };
    autoConnect();
  }, []);

  const shortAddress = account
    ? `${account.slice(0, 6)}...${account.slice(-4)}`
    : '';

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
      <div className="w-full max-w-3xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Welcome! Gorgi</h1>
          <p className="text-slate-400">
            A decentralized voting and auction platform running on{' '}
            <span className="font-semibold text-teal-300">Sepolia</span>.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          {/*  Connection Status Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              {account ? (
                <>
                  <p className="text-sm text-slate-400">Wallet Connected</p>
                  <p className="font-mono text-teal-300">{shortAddress}</p>
                  <p className="text-xs mt-1 text-slate-500">
                    Network Status:
                    {isSepolia ? (
                      <span className="text-emerald-400 font-semibold">
                        Sepolia ✔
                      </span>
                    ) : (
                      <span className="text-red-400 font-semibold">
                        Not Sepolia ✖
                      </span>
                    )}
                  </p>
                </>
              ) : (
                <p className="text-slate-400 text-sm">
                  Wallet not connected. Please connect MetaMask.
                </p>
              )}
            </div>

            <button
              onClick={connectWallet}
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 transition text-slate-900 font-semibold"
            >
              {account ? 'Reconnect MetaMask' : 'Connect MetaMask Wallet'}
            </button>
          </div>

          {/* Main screen: choose to go to Voting or Auction */}
          {account && isSepolia && view === 'home' && (
            <div>
              <h2 className="text-xl font-semibold mb-2">
                Where do you want to go now?
              </h2>
              <p className="text-slate-400 mb-4 text-sm">
                Choose a feature to start interacting (all operations will be conducted on Sepolia).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setView('vote')}
                  className="rounded-2xl border border-slate-700 bg-slate-900/60 hover:bg-slate-800 transition p-4 text-left"
                >
                  <h3 className="font-semibold mb-1">🗳 Voting</h3>
                  <p className="text-sm text-slate-400">
                    View current voting topics, create new topics, and cast "Yes / No" votes on proposals of interest.
                  </p>
                </button>

                <button
                  onClick={() => setView('auction')}
                  className="rounded-2xl border border-slate-700 bg-slate-900/60 hover:bg-slate-800 transition p-4 text-left"
                >
                  <h3 className="font-semibold mb-1">🏦 Auction</h3>
                  <p className="text-sm text-slate-400">
                    Every period, an item will appear, and the highest bidder becomes the temporary highest bidder.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Prompt when not logged in / not on Sepolia */}
          {(!account || !isSepolia) && (
            <div className="mt-4 text-sm text-slate-400">
              <p>Please connect your wallet and ensure MetaMask is set to the Sepolia test network.</p>
            </div>
          )}

          {/* Voting Section */}
          {account && isSepolia && view === 'vote' && (
            <VoteSection
              onBack={() => setView('home')}
              provider={provider}
              account={account}
            />
          )}

          {/* Auction Section */}
          {account && isSepolia && view === 'auction' && (
            <AuctionSection
              onBack={() => setView('home')}
              provider={provider}
              account={account}
            />
          )}
        </div>
      </div>
    </main>
  );
}

// ================== Voting Section ==================

// ================== Voting Section (Connected to On-Chain Voting Contract) ==================

type VoteSectionProps = {
  onBack: () => void;
  provider: ethers.BrowserProvider | null;
  account: string;
};

function VoteSection({ onBack, provider, account }: VoteSectionProps) {

  const [topics, setTopics] = useState<
    { id: number; title: string; creator: string; deadline: number; yes: number; no: number }[]
  >([]);
  const [newTopic, setNewTopic] = useState('');
  const [newDeadline, setNewDeadline] = useState(''); // string in datetime-local format
  const [loading, setLoading] = useState(false);
  const [txLoading, setTxLoading] = useState(false);

  // Get Voting contract instance
  const getVotingContract = async () => {
    if (!provider) throw new Error('No provider');
    const signer = await provider.getSigner();
    return new ethers.Contract(
      VOTING_CONTRACT_ADDRESS,
      VOTING_CONTRACT_ABI,
      signer
    );
  };

  // Load all topics from the blockchain
  const loadTopics = async () => {
    if (!provider) return;
    try {
      setLoading(true);
      const contract = await getVotingContract();

      // Solidity: getAllTopics() returns (uint256[] ids, string[] titles, address[] creators, uint256[] deadlines, uint256[] yesCounts, uint256[] noCounts)
      const [ids, titles, creators, deadlines, yesCounts, noCounts] = await contract.getAllTopics();

      const formatted = (ids as bigint[]).map((id, idx) => ({
        id: Number(id),
        title: titles[idx] as string,
        creator: creators[idx] as string,
        deadline: Number(deadlines[idx]),
        yes: Number(yesCounts[idx]),
        no: Number(noCounts[idx]),
      }));

      setTopics(formatted);
    } catch (err) {
      console.error('loadTopics error:', err);
      alert('Error loading topics (please ensure you are on Sepolia and the contract address is correct)');
    } finally {
      setLoading(false);
    }
  };

  // Reload on initialization and when the account or provider changes.
  useEffect(() => {
    loadTopics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, account]);

  // Create new topic: call createTopic
  const createTopic = async () => {
  if (!newTopic.trim()) {
    alert('Please enter a topic title');
    return;
  }
  if (!newDeadline) {
    alert('Please select a deadline');
    return;
  }
  if (!provider) {
    alert('Wallet not connected');
    return;
  }

  try {
    // Parse datetime-local value and convert to timestamp (seconds)
    // newDeadline e.g. "2025-11-25T15:30"
    const selected = new Date(newDeadline);
    const deadlineSec = Math.floor(selected.getTime() / 1000);
    const nowSec = Math.floor(Date.now() / 1000);

    const durationSeconds = deadlineSec - nowSec;
    if (durationSeconds <= 0) {
      alert('Deadline must be after the current time');
      return;
    }

    // Maximum 30-day limit (should match contract MAX_DURATION)
    const maxDuration = 30 * 24 * 60 * 60;
    if (durationSeconds > maxDuration) {
      alert('Deadline cannot be more than 30 days from now');
      return;
    }

    setTxLoading(true);
    const contract = await getVotingContract();
    // Solidity: createTopic(string _title, uint256 _durationSeconds)
    const tx = await contract.createTopic(newTopic.trim(), durationSeconds);
    await tx.wait();

    setNewTopic('');
    setNewDeadline('');
    await loadTopics();
  } catch (err: any) {
    console.error('createTopic error:', err);
    alert('Error creating topic: ' + (err?.reason || err?.message || 'Unknown error'));
  } finally {
    setTxLoading(false);
  }
};


  // Vote: call vote(topicId, support)
  const handleVote = async (id: number, support: boolean) => {
    if (!provider) {
      alert('Wallet not connected');
      return;
    }
    try {
      setTxLoading(true);
      const contract = await getVotingContract();
      const tx = await contract.vote(id, support);
      await tx.wait();
      await loadTopics();
    } catch (err: any) {
      console.error('vote error:', err);
      const msg =
        err?.reason ||
        err?.error?.message ||
        err?.message ||
        'Error during vote';
      alert(msg);
    } finally {
      setTxLoading(false);
    }
  };

  return (
    <div className="space-y-5 mt-4">
      <button
        onClick={onBack}
        className="text-sm text-slate-400 hover:text-slate-200"
      >
        ← Back to Home
      </button>

      <div>
        <h2 className="text-xl font-semibold mb-1">🗳 Voting</h2>
        <p className="text-slate-400 text-sm">
          All topics are stored on Sepolia; your votes are recorded directly on-chain.
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Current address: <span className="font-mono">{account}</span>
        </p>
      </div>

      {/* Create New Topic */}
      <div className="border border-slate-800 rounded-2xl p-4">
      <h3 className="font-semibold mb-2">Create New Topic</h3>

      <div className="space-y-3">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-slate-300">Topic Title</label>
          <input
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            placeholder="e.g.: Should we issue a platform token?"
            className="flex-1 rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-teal-400"
            disabled={txLoading}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-slate-300">Deadline</label>
          <input
            type="datetime-local"
            value={newDeadline}
            onChange={(e) => setNewDeadline(e.target.value)}
            className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-teal-400"
            disabled={txLoading}
          />
          <p className="text-xs text-slate-500">
            You selected local time; the contract will convert it to an on-chain UNIX timestamp.
            Maximum: {`30 days`}.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={createTopic}
            disabled={txLoading || !newTopic.trim() || !newDeadline}
            className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 font-semibold text-sm"
          >
            {txLoading ? 'Transaction in progress...' : 'Create Topic'}
          </button>
        </div>
      </div>
    </div>


      {/* Voting board */}
      <div className="border border-slate-800 rounded-2xl p-4">
        <h3 className="font-semibold mb-3">Voting Board (on-chain data)</h3>

        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : topics.length === 0 ? (
          <p className="text-sm text-slate-500">No topics yet — try creating one!</p>
        ) : (
          <div className="space-y-3">
            {topics.map((topic) => (
              <div
                key={topic.id}
                className="rounded-xl bg-slate-950/80 border border-slate-800 p-3"
              >
                <p className="font-semibold mb-1">
                  #{topic.id} {topic.title}
                </p>
                <p className="text-xs text-slate-500 mb-1">
                  Creator: {topic.creator.slice(0, 6)}...{topic.creator.slice(-4)}
                </p>
                <p className="text-xs text-slate-500 mb-1">
                  Deadline: {new Date(topic.deadline * 1000).toLocaleString()}
                  {topic.deadline * 1000 < Date.now() ? ' (Ended)' : ''}
                </p>
                <p className="text-xs text-slate-500 mb-2">
                  Yes: {topic.yes}, No: {topic.no}
                </p>
                <div className="flex gap-2">
                  {topic.deadline * 1000 > Date.now() ? (
                    <>
                      <button
                        onClick={() => handleVote(topic.id, true)}
                        disabled={txLoading}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-900 text-xs font-semibold"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => handleVote(topic.id, false)}
                        disabled={txLoading}
                        className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 disabled:opacity-60 text-slate-900 text-xs font-semibold"
                      >
                        No
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-slate-500 italic">Voting closed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


// ================== Auction Section ==================

type AuctionSectionProps = {
  onBack: () => void;
  provider: ethers.BrowserProvider | null;
  account: string;
};

function AuctionSection({ onBack, provider, account }: AuctionSectionProps) {
  const [activeItems, setActiveItems] = useState<
    { id: number; name: string; seller: string; endTime: number; highestBidder: string; highestBid: string }[]
  >([]);
  const [allItems, setAllItems] = useState<
    { id: number; name: string; seller: string; endTime: number; highestBidder: string; highestBid: string; ended: boolean }[]
  >([]);
  
  const [newItemName, setNewItemName] = useState('');
  const [newItemDuration, setNewItemDuration] = useState('');
  const [bidAmount, setBidAmount] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [txLoading, setTxLoading] = useState(false);

  // Get Auction contract instance
  const getAuctionContract = async () => {
    if (!provider) throw new Error('No provider');
    const signer = await provider.getSigner();
    return new ethers.Contract(
      AUCTION_CONTRACT_ADDRESS,
      AUCTION_CONTRACT_ABI,
      signer
    );
  };

  // Load all auction items from the blockchain
  const loadItems = async () => {
    if (!provider) return;
    try {
      setLoading(true);
      const contract = await getAuctionContract();

      // Get active auctions
      const [activeIds, activeNames, activeSellers, activeEndTimes, activeHighestBidders, activeHighestBids] = await contract.getActiveItems();
      
      const formattedActive = (activeIds as bigint[]).map((id, idx) => ({
        id: Number(id),
        name: activeNames[idx] as string,
        seller: activeSellers[idx] as string,
        endTime: Number(activeEndTimes[idx]),
        highestBidder: activeHighestBidders[idx] as string,
        highestBid: ethers.formatEther(activeHighestBids[idx])
      }));

      // Get all auctions
      const [allIds, allNames, allSellers, allEndTimes, allHighestBidders, allHighestBids, allEnded] = await contract.getAllItems();
      
      const formattedAll = (allIds as bigint[]).map((id, idx) => ({
        id: Number(id),
        name: allNames[idx] as string,
        seller: allSellers[idx] as string,
        endTime: Number(allEndTimes[idx]),
        highestBidder: allHighestBidders[idx] as string,
        highestBid: ethers.formatEther(allHighestBids[idx]),
        ended: allEnded[idx]
      }));

      setActiveItems(formattedActive);
      setAllItems(formattedAll);
    } catch (err) {
      console.error('loadItems error:', err);
      alert('Error loading auctions');
    } finally {
      setLoading(false);
    }
  };

  // Load on initialization
  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, account]);

  // Create new auction/item
  const createItem = async () => {
    if (!newItemName.trim()) {
      alert('Please enter an item name');
      return;
    }
    if (!newItemDuration) {
      alert('Please select auction duration');
      return;
    }
    if (!provider) {
      alert('Wallet not connected');
      return;
    }

    try {
      setTxLoading(true);
      const durationHours = parseInt(newItemDuration);
      const durationSeconds = durationHours * 3600;

      const contract = await getAuctionContract();
      const tx = await contract.createItem(newItemName.trim(), durationSeconds);
      await tx.wait();

      setNewItemName('');
      setNewItemDuration('');
      await loadItems();
    } catch (err: any) {
      console.error('createItem error:', err);
      alert('Error creating auction: ' + (err?.reason || err?.message || 'Unknown error'));
    } finally {
      setTxLoading(false);
    }
  };

  // Place bid
  const placeBid = async (itemId: number) => {
    if (!provider) {
      alert('Wallet not connected');
      return;
    }
    if (!bidAmount || Number(bidAmount) <= 0) {
      alert('Please enter a valid bid amount');
      return;
    }

    try {
      setTxLoading(true);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      const balance = await provider.getBalance(userAddress);
      const bidInWei = ethers.parseEther(bidAmount);

      if (balance < bidInWei) {
        alert('Insufficient wallet balance to place bid');
        return;
      }

      const contract = await getAuctionContract();
      const tx = await contract.bid(itemId, { value: bidInWei });
      await tx.wait();

      setBidAmount('');
      setSelectedItemId(null);
      await loadItems();
    } catch (err: any) {
      console.error('placeBid error:', err);
      const msg = err?.reason || err?.error?.message || err?.message || 'Error placing bid';
      alert(msg);
    } finally {
      setTxLoading(false);
    }
  };

  return (
    <div className="space-y-5 mt-4">
      <button
        onClick={onBack}
        className="text-sm text-slate-400 hover:text-slate-200"
      >
        ← Back to Home
      </button>

      <div>
        <h2 className="text-xl font-semibold mb-1">🏦 Auction</h2>
        <p className="text-slate-400 text-sm">
          All auctions are stored on Sepolia; you can create new items or bid on existing ones.
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Current address: <span className="font-mono">{account}</span>
        </p>
      </div>

      {/* Create New Auction */}
      <div className="border border-slate-800 rounded-2xl p-4">
        <h3 className="font-semibold mb-2">Create New Auction</h3>
        <div className="space-y-3">
          <div className="flex flex-col gap-2">
            <label className="text-sm text-slate-300">Item Name</label>
            <input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="e.g.: Mysterious Gorgi Collectible Card"
              className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-teal-400"
              disabled={txLoading}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-slate-300">Auction Duration</label>
            <select
              value={newItemDuration}
              onChange={(e) => setNewItemDuration(e.target.value)}
              className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-teal-400"
              disabled={txLoading}
            >
              <option value="">Select duration</option>
              <option value="1">1 hour</option>
              <option value="6">6 hours</option>
              <option value="24">1 day</option>
              <option value="168">1 week</option>
            </select>
          </div>
          <button
            onClick={createItem}
            disabled={txLoading || !newItemName.trim() || !newItemDuration}
            className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 font-semibold text-sm"
          >
            {txLoading ? 'Transaction in progress...' : 'Create Auction'}
          </button>
        </div>
      </div>

      {/* Active Auctions */}
      <div className="border border-slate-800 rounded-2xl p-4">
          <h3 className="font-semibold mb-3">Active Auctions (on-chain data)</h3>
          {loading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : activeItems.length === 0 ? (
            <p className="text-sm text-slate-500">No active auctions yet — try creating one!</p>
        ) : (
          <div className="space-y-3">
            {activeItems.map((item) => (
              <div
                key={item.id}
                className="rounded-xl bg-slate-950/80 border border-slate-800 p-3"
              >
                <p className="font-semibold mb-1">#{item.id} {item.name}</p>
                <p className="text-xs text-slate-500 mb-1">
                  Seller: {item.seller.slice(0, 6)}...{item.seller.slice(-4)}
                </p>
                <p className="text-xs text-slate-500 mb-1">
                  End time: {new Date(item.endTime * 1000).toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mb-2">
                  Current highest bid: {item.highestBid} ETH
                  {item.highestBidder !== '0x0000000000000000000000000000000000000000' && (
                    <span> by {item.highestBidder.slice(0, 6)}...{item.highestBidder.slice(-4)}</span>
                  )}
                </p>
                
                {selectedItemId === item.id ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        placeholder={`Must be > ${item.highestBid} ETH`}
                        className="flex-1 rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs outline-none focus:border-teal-400"
                        disabled={txLoading}
                      />
                      <button
                        onClick={() => placeBid(item.id)}
                        disabled={txLoading}
                        className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-900 text-xs font-semibold"
                      >
                        {txLoading ? 'Bidding...' : 'Confirm Bid'}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedItemId(null);
                          setBidAmount('');
                        }}
                        disabled={txLoading}
                        className="px-3 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 disabled:opacity-60 text-slate-200 text-xs font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedItemId(item.id)}
                    disabled={txLoading || item.seller === account}
                    className="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 text-xs font-semibold"
                  >
                    {item.seller === account ? 'Your item' : 'Bid'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Auction history */}
      {allItems.length > 0 && (
        <div className="border border-slate-800 rounded-2xl p-4">
          <h3 className="font-semibold mb-3">All Auction Records</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {allItems.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-xs p-2 rounded bg-slate-950/60">
                <span>#{item.id} {item.name}</span>
                <span className={item.ended ? 'text-red-400' : 'text-green-400'}>
                  {item.ended ? 'Ended' : 'Ongoing'} - {item.highestBid} ETH
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
