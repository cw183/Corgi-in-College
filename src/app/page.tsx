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

  // 連接 MetaMask
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert('請先安裝 MetaMask');
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
        alert('請切換到 Sepolia 測試網再使用此應用');
      }
    } catch (err: any) {
      console.error(err);
      alert('連接錢包時發生錯誤：' + (err?.message ?? '未知錯誤'));
    }
  };

  // 自動偵測是否已連線 + 網路
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
            一個在 <span className="font-semibold text-teal-300">Sepolia</span>{' '}
            上運行的去中心化投票與競標平台
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          {/* 連接狀態列 */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              {account ? (
                <>
                  <p className="text-sm text-slate-400">已連接錢包</p>
                  <p className="font-mono text-teal-300">{shortAddress}</p>
                  <p className="text-xs mt-1 text-slate-500">
                    網路狀態：
                    {isSepolia ? (
                      <span className="text-emerald-400 font-semibold">
                        Sepolia ✔
                      </span>
                    ) : (
                      <span className="text-red-400 font-semibold">
                        非 Sepolia ✖
                      </span>
                    )}
                  </p>
                </>
              ) : (
                <p className="text-slate-400 text-sm">
                  尚未連接錢包，請先連接 MetaMask。
                </p>
              )}
            </div>

            <button
              onClick={connectWallet}
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 transition text-slate-900 font-semibold"
            >
              {account ? '重新連接 MetaMask' : '連接 MetaMask 錢包'}
            </button>
          </div>

          {/* 主畫面：選擇去投票所 / 競標所 */}
          {account && isSepolia && view === 'home' && (
            <div>
              <h2 className="text-xl font-semibold mb-2">
                現在你想去哪裡？
              </h2>
              <p className="text-slate-400 mb-4 text-sm">
                選擇一個功能開始互動（所有操作都會在 Sepolia 上進行）。
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setView('vote')}
                  className="rounded-2xl border border-slate-700 bg-slate-900/60 hover:bg-slate-800 transition p-4 text-left"
                >
                  <h3 className="font-semibold mb-1">🗳 投票所</h3>
                  <p className="text-sm text-slate-400">
                    查看目前的投票議題、創建新議題、對感興趣的提案投下「是 / 否」。
                  </p>
                </button>

                <button
                  onClick={() => setView('auction')}
                  className="rounded-2xl border border-slate-700 bg-slate-900/60 hover:bg-slate-800 transition p-4 text-left"
                >
                  <h3 className="font-semibold mb-1">🏦 競標所</h3>
                  <p className="text-sm text-slate-400">
                    每段時間會出現一件商品，出更高的標，成為暫時的最高出價者。
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* 沒登入 / 沒在 Sepolia 時的提示 */}
          {(!account || !isSepolia) && (
            <div className="mt-4 text-sm text-slate-400">
              <p>請先連接錢包，並確認 MetaMask 網路切換到 Sepolia 測試網。</p>
            </div>
          )}

          {/* 投票所 */}
          {account && isSepolia && view === 'vote' && (
            <VoteSection
              onBack={() => setView('home')}
              provider={provider}
              account={account}
            />
          )}

          {/* 競標所 */}
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

// ================== 投票所 ==================

// ================== 投票所區塊（接上鏈上 Voting 合約版本） ==================

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
  const [newDeadline, setNewDeadline] = useState(''); // datetime-local 的字串
  const [loading, setLoading] = useState(false);
  const [txLoading, setTxLoading] = useState(false);

  // 取得 Voting 合約實例
  const getVotingContract = async () => {
    if (!provider) throw new Error('No provider');
    const signer = await provider.getSigner();
    return new ethers.Contract(
      VOTING_CONTRACT_ADDRESS,
      VOTING_CONTRACT_ABI,
      signer
    );
  };

  // 從鏈上讀取所有議題
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
      alert('讀取議題時發生錯誤（請確認你在 Sepolia，且合約地址正確）');
    } finally {
      setLoading(false);
    }
  };

  // 初始化時 / account 或 provider 變動時，重新載入
  useEffect(() => {
    loadTopics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, account]);

  // 建立新議題：呼叫 createTopic
  const createTopic = async () => {
  if (!newTopic.trim()) {
    alert('請輸入議題標題');
    return;
  }
  if (!newDeadline) {
    alert('請選擇截止時間');
    return;
  }
  if (!provider) {
    alert('尚未連接錢包');
    return;
  }

  try {
    // 解析 datetime-local 的值，轉成 timestamp（秒）
    // newDeadline 例如 "2025-11-25T15:30"
    const selected = new Date(newDeadline);
    const deadlineSec = Math.floor(selected.getTime() / 1000);
    const nowSec = Math.floor(Date.now() / 1000);

    const durationSeconds = deadlineSec - nowSec;
    if (durationSeconds <= 0) {
      alert('截止時間必須晚於現在');
      return;
    }

    // 最長 30 天限制（跟合約 MAX_DURATION 要一致）
    const maxDuration = 30 * 24 * 60 * 60;
    if (durationSeconds > maxDuration) {
      alert('截止時間不能超過 30 天後');
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
    alert('建立議題時發生錯誤：' + (err?.reason || err?.message || '未知錯誤'));
  } finally {
    setTxLoading(false);
  }
};


  // 投票：呼叫 vote(topicId, support)
  const handleVote = async (id: number, support: boolean) => {
    if (!provider) {
      alert('尚未連接錢包');
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
        '投票時發生錯誤';
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
        ← 回首頁
      </button>

      <div>
        <h2 className="text-xl font-semibold mb-1">🗳 投票所</h2>
        <p className="text-slate-400 text-sm">
          所有議題都儲存在 Sepolia 上，你的投票會直接寫入區塊鏈。
        </p>
        <p className="text-xs text-slate-500 mt-1">
          當前地址：<span className="font-mono">{account}</span>
        </p>
      </div>

      {/* 建立新議題 */}
      <div className="border border-slate-800 rounded-2xl p-4">
      <h3 className="font-semibold mb-2">建立新議題</h3>

      <div className="space-y-3">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-slate-300">議題標題</label>
          <input
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            placeholder="例如：是否發行平台代幣？"
            className="flex-1 rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-teal-400"
            disabled={txLoading}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-slate-300">截止時間</label>
          <input
            type="datetime-local"
            value={newDeadline}
            onChange={(e) => setNewDeadline(e.target.value)}
            className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-teal-400"
            disabled={txLoading}
          />
          <p className="text-xs text-slate-500">
            你選的是本地時間，合約會換算成區塊鏈上的 UNIX timestamp。
            最長可設定 {`30 天`} 內。
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={createTopic}
            disabled={txLoading || !newTopic.trim() || !newDeadline}
            className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 font-semibold text-sm"
          >
            {txLoading ? '交易進行中...' : '建立議題'}
          </button>
        </div>
      </div>
    </div>


      {/* 公布欄 */}
      <div className="border border-slate-800 rounded-2xl p-4">
        <h3 className="font-semibold mb-3">投票公布欄（鏈上資料）</h3>

        {loading ? (
          <p className="text-sm text-slate-500">讀取中...</p>
        ) : topics.length === 0 ? (
          <p className="text-sm text-slate-500">目前還沒有任何議題，試著建立一個吧！</p>
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
                  創建者：{topic.creator.slice(0, 6)}...{topic.creator.slice(-4)}
                </p>
                <p className="text-xs text-slate-500 mb-1">
                  截止時間：{new Date(topic.deadline * 1000).toLocaleString('zh-TW')}
                  {topic.deadline * 1000 < Date.now() ? ' (已截止)' : ''}
                </p>
                <p className="text-xs text-slate-500 mb-2">
                  贊成：{topic.yes}，反對：{topic.no}
                </p>
                <div className="flex gap-2">
                  {topic.deadline * 1000 > Date.now() ? (
                    <>
                      <button
                        onClick={() => handleVote(topic.id, true)}
                        disabled={txLoading}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-900 text-xs font-semibold"
                      >
                        贊成
                      </button>
                      <button
                        onClick={() => handleVote(topic.id, false)}
                        disabled={txLoading}
                        className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 disabled:opacity-60 text-slate-900 text-xs font-semibold"
                      >
                        反對
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-slate-500 italic">投票已截止</span>
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


// ================== 競標所 ==================

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

  // 取得 Auction 合約實例
  const getAuctionContract = async () => {
    if (!provider) throw new Error('No provider');
    const signer = await provider.getSigner();
    return new ethers.Contract(
      AUCTION_CONTRACT_ADDRESS,
      AUCTION_CONTRACT_ABI,
      signer
    );
  };

  // 從鏈上讀取所有競標
  const loadItems = async () => {
    if (!provider) return;
    try {
      setLoading(true);
      const contract = await getAuctionContract();

      // 獲取活躍競標
      const [activeIds, activeNames, activeSellers, activeEndTimes, activeHighestBidders, activeHighestBids] = await contract.getActiveItems();
      
      const formattedActive = (activeIds as bigint[]).map((id, idx) => ({
        id: Number(id),
        name: activeNames[idx] as string,
        seller: activeSellers[idx] as string,
        endTime: Number(activeEndTimes[idx]),
        highestBidder: activeHighestBidders[idx] as string,
        highestBid: ethers.formatEther(activeHighestBids[idx])
      }));

      // 獲取所有競標
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
      alert('讀取競標時發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  // 初始化時載入
  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, account]);

  // 建立新競標
  const createItem = async () => {
    if (!newItemName.trim()) {
      alert('請輸入商品名稱');
      return;
    }
    if (!newItemDuration) {
      alert('請選擇競標時長');
      return;
    }
    if (!provider) {
      alert('尚未連接錢包');
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
      alert('建立競標時發生錯誤：' + (err?.reason || err?.message || '未知錯誤'));
    } finally {
      setTxLoading(false);
    }
  };

  // 出價
  const placeBid = async (itemId: number) => {
    if (!provider) {
      alert('尚未連接錢包');
      return;
    }
    if (!bidAmount || Number(bidAmount) <= 0) {
      alert('請輸入有效的出價金額');
      return;
    }

    try {
      setTxLoading(true);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      const balance = await provider.getBalance(userAddress);
      const bidInWei = ethers.parseEther(bidAmount);

      if (balance < bidInWei) {
        alert('錢包餘額不足，無法出價');
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
      const msg = err?.reason || err?.error?.message || err?.message || '出價時發生錯誤';
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
        ← 回首頁
      </button>

      <div>
        <h2 className="text-xl font-semibold mb-1">🏦 競標所</h2>
        <p className="text-slate-400 text-sm">
          所有競標都儲存在 Sepolia 上，你可以建立新商品或對現有商品出價。
        </p>
        <p className="text-xs text-slate-500 mt-1">
          當前地址：<span className="font-mono">{account}</span>
        </p>
      </div>

      {/* 建立新競標 */}
      <div className="border border-slate-800 rounded-2xl p-4">
        <h3 className="font-semibold mb-2">建立新競標</h3>
        <div className="space-y-3">
          <div className="flex flex-col gap-2">
            <label className="text-sm text-slate-300">商品名稱</label>
            <input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="例如：神秘 Gorgi 收藏卡"
              className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-teal-400"
              disabled={txLoading}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-slate-300">競標時長</label>
            <select
              value={newItemDuration}
              onChange={(e) => setNewItemDuration(e.target.value)}
              className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-teal-400"
              disabled={txLoading}
            >
              <option value="">選擇時長</option>
              <option value="1">1 小時</option>
              <option value="6">6 小時</option>
              <option value="24">1 天</option>
              <option value="168">1 週</option>
            </select>
          </div>
          <button
            onClick={createItem}
            disabled={txLoading || !newItemName.trim() || !newItemDuration}
            className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 font-semibold text-sm"
          >
            {txLoading ? '交易進行中...' : '建立競標'}
          </button>
        </div>
      </div>

      {/* 活躍競標 */}
      <div className="border border-slate-800 rounded-2xl p-4">
        <h3 className="font-semibold mb-3">活躍競標（鏈上資料）</h3>
        {loading ? (
          <p className="text-sm text-slate-500">讀取中...</p>
        ) : activeItems.length === 0 ? (
          <p className="text-sm text-slate-500">目前沒有活躍的競標，試著建立一個吧！</p>
        ) : (
          <div className="space-y-3">
            {activeItems.map((item) => (
              <div
                key={item.id}
                className="rounded-xl bg-slate-950/80 border border-slate-800 p-3"
              >
                <p className="font-semibold mb-1">#{item.id} {item.name}</p>
                <p className="text-xs text-slate-500 mb-1">
                  賣家：{item.seller.slice(0, 6)}...{item.seller.slice(-4)}
                </p>
                <p className="text-xs text-slate-500 mb-1">
                  截止時間：{new Date(item.endTime * 1000).toLocaleString('zh-TW')}
                </p>
                <p className="text-xs text-slate-500 mb-2">
                  當前最高標：{item.highestBid} ETH
                  {item.highestBidder !== '0x0000000000000000000000000000000000000000' && (
                    <span> 由 {item.highestBidder.slice(0, 6)}...{item.highestBidder.slice(-4)}</span>
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
                        placeholder={`需 > ${item.highestBid} ETH`}
                        className="flex-1 rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs outline-none focus:border-teal-400"
                        disabled={txLoading}
                      />
                      <button
                        onClick={() => placeBid(item.id)}
                        disabled={txLoading}
                        className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-900 text-xs font-semibold"
                      >
                        {txLoading ? '出價中...' : '確認出價'}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedItemId(null);
                          setBidAmount('');
                        }}
                        disabled={txLoading}
                        className="px-3 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 disabled:opacity-60 text-slate-200 text-xs font-semibold"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedItemId(item.id)}
                    disabled={txLoading || item.seller === account}
                    className="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 text-xs font-semibold"
                  >
                    {item.seller === account ? '自己的商品' : '出價'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 歷史競標 */}
      {allItems.length > 0 && (
        <div className="border border-slate-800 rounded-2xl p-4">
          <h3 className="font-semibold mb-3">所有競標記錄</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {allItems.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-xs p-2 rounded bg-slate-950/60">
                <span>#{item.id} {item.name}</span>
                <span className={item.ended ? 'text-red-400' : 'text-green-400'}>
                  {item.ended ? '已結束' : '進行中'} - {item.highestBid} ETH
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
