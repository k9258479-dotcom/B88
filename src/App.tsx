import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BannerCarousel } from './components/BannerCarousel';
import { ProviderBar } from './components/ProviderBar';
import { CategoryNav } from './components/CategoryNav';
import { GameCard } from './components/GameCard';
import { SlotMachineGame } from './components/games/SlotMachineGame';
import { CrashGame } from './components/games/CrashGame';
import { DiamondMinesGame } from './components/games/DiamondMinesGame';
import { ColorGame } from './components/games/ColorGame';
import { CashierModal } from './components/CashierModal';
import { AuthModal } from './components/AuthModal';
import { PromotionsModal } from './components/PromotionsModal';
import { VIPModal } from './components/VIPModal';
import { LiveChatWidget } from './components/LiveChatWidget';
import { Footer } from './components/Footer';

import { api } from './services/api';
import { GAMES_CATALOG } from './data/games';
import { UserProfile, GameItem, GameCategory, Transaction, Promotion, VIPTier } from './types';
import { Home, Gift, PlusCircle, Gamepad2, User, Trophy, Play } from 'lucide-react';
import { sounds } from './utils/audio';

export default function App() {
  // User Profile & Wallet State (Empty initial state until user registers or logs in)
  const [user, setUser] = useState<UserProfile>({
    id: 'guest',
    phone: '',
    username: 'Guest Player',
    balance: 0,
    vipLevel: 1,
    vipPoints: 0,
    currency: 'PHP',
    isLoggedIn: false,
    avatar: '👤',
    totalDeposited: 0,
    totalWithdrawn: 0,
  });

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [vipTiers, setVipTiers] = useState<VIPTier[]>([]);

  // Navigation & Filtering
  const [activeCategory, setActiveCategory] = useState<GameCategory>('all');
  const [selectedProvider, setSelectedProvider] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [cashierOpen, setCashierOpen] = useState(false);
  const [cashierTab, setCashierTab] = useState<'deposit' | 'withdraw' | 'history'>('deposit');
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [promosOpen, setPromosOpen] = useState(false);
  const [vipOpen, setVipOpen] = useState(false);

  // Active Interactive Game
  const [activeGame, setActiveGame] = useState<GameItem | null>(null);

  // Initial Data Fetching from fullstack Express backend
  useEffect(() => {
    async function loadInitialData() {
      const userRes = await api.getCurrentUser();
      if (userRes.success && userRes.user) {
        setUser(userRes.user);
      }

      const walletRes = await api.getWallet();
      if (walletRes.success && walletRes.transactions) {
        setTransactions(walletRes.transactions);
      }

      const promoRes = await api.getPromotions();
      if (promoRes.success && promoRes.promotions) {
        setPromotions(promoRes.promotions);
      }

      const vipRes = await api.getVipInfo();
      if (vipRes.success && vipRes.levels) {
        setVipTiers(vipRes.levels);
      }
    }

    loadInitialData();
  }, []);

  const handleRefreshWallet = async () => {
    const walletRes = await api.getWallet();
    if (walletRes.success) {
      setUser(prev => ({ ...prev, balance: walletRes.balance }));
      if (walletRes.transactions) {
        setTransactions(walletRes.transactions);
      }
    }
  };

  const handleBalanceUpdate = (newBal: number) => {
    setUser(prev => ({ ...prev, balance: newBal }));
  };

  const handleOpenCashier = (tab: 'deposit' | 'withdraw' | 'history' = 'deposit') => {
    sounds.playClick();
    setCashierTab(tab);
    setCashierOpen(true);
  };

  const handleOpenAuth = (mode: 'login' | 'register' = 'login') => {
    sounds.playClick();
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const handleLogout = async () => {
    sounds.playClick();
    await api.logout();
    setUser(prev => ({ ...prev, isLoggedIn: false }));
  };

  const handleLoginSuccess = (loggedInUser: UserProfile) => {
    setUser(loggedInUser);
    handleRefreshWallet();
  };

  const handleLaunchGame = (game: GameItem) => {
    sounds.playClick();
    setActiveGame(game);
  };

  // Filtered games catalog
  const filteredGames = GAMES_CATALOG.filter(game => {
    const matchesCategory =
      activeCategory === 'all' ? true : game.category === activeCategory;
    const matchesProvider =
      selectedProvider === 'ALL' ? true : game.provider === selectedProvider;
    const matchesSearch =
      searchQuery.trim() === ''
        ? true
        : game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          game.provider.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesProvider && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950 font-sans">
      {/* Top 1-row 3-zone Header Contract */}
      <Header
        user={user}
        onOpenCashier={handleOpenCashier}
        onOpenAuth={handleOpenAuth}
        onOpenVIP={() => {
          sounds.playClick();
          setVipOpen(true);
        }}
        onOpenPromos={() => {
          sounds.playClick();
          setPromosOpen(true);
        }}
        onSelectCategory={setActiveCategory}
        activeCategory={activeCategory}
        onLogout={handleLogout}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Active Playable Game Area (When a game is launched) */}
        {activeGame && (
          <div className="mb-10 animate-fadeIn">
            {activeGame.id === 'game_golden_dragon' || activeGame.category === 'slots' ? (
              <SlotMachineGame
                userBalance={user.balance}
                onBalanceUpdate={handleBalanceUpdate}
                onClose={() => setActiveGame(null)}
                onOpenCashier={() => handleOpenCashier('deposit')}
              />
            ) : activeGame.id === 'game_rocket_crash' ? (
              <CrashGame
                userBalance={user.balance}
                onBalanceUpdate={handleBalanceUpdate}
                onClose={() => setActiveGame(null)}
                onOpenCashier={() => handleOpenCashier('deposit')}
              />
            ) : activeGame.id === 'game_diamond_mines' ? (
              <DiamondMinesGame
                userBalance={user.balance}
                onBalanceUpdate={handleBalanceUpdate}
                onClose={() => setActiveGame(null)}
                onOpenCashier={() => handleOpenCashier('deposit')}
              />
            ) : activeGame.id === 'game_perya_color' || activeGame.category === 'perya' ? (
              <ColorGame
                userBalance={user.balance}
                onBalanceUpdate={handleBalanceUpdate}
                onClose={() => setActiveGame(null)}
                onOpenCashier={() => handleOpenCashier('deposit')}
              />
            ) : (
              /* Fallback Live Table Game Runner */
              <div className="p-8 bg-slate-900 border border-amber-500/30 rounded-2xl text-center space-y-4 max-w-2xl mx-auto shadow-2xl">
                <span className="text-5xl">🃏</span>
                <h3 className="text-xl font-bold text-amber-400">{activeGame.title}</h3>
                <p className="text-xs text-slate-300">
                  {activeGame.provider} Live Dealer Table is actively streaming. Virtual chips ready.
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setActiveGame(GAMES_CATALOG[0])}
                    className="px-5 py-2.5 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs uppercase"
                  >
                    Play Super Golden Fortune
                  </button>
                  <button
                    onClick={() => setActiveGame(null)}
                    className="px-5 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs"
                  >
                    Back to Lobby
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hero Promotional Banner (shown when no game active or in lobby) */}
        {!activeGame && (
          <BannerCarousel
            onPlaySlot={() => handleLaunchGame(GAMES_CATALOG[0])}
            onOpenCashier={() => handleOpenCashier('deposit')}
            onOpenPromos={() => setPromosOpen(true)}
          />
        )}

        {/* Top Provider Bar */}
        <ProviderBar
          selectedProvider={selectedProvider}
          onSelectProvider={setSelectedProvider}
        />

        {/* Category Navigation & Search Bar */}
        <CategoryNav
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Games Grid Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm sm:text-base font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-400 rounded-full" />
              {activeCategory === 'all'
                ? 'Popular Casino Games'
                : `${activeCategory.toUpperCase()} COLLECTION`}
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              Showing {filteredGames.length} Games
            </span>
          </div>

          {filteredGames.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/50 border border-slate-800 rounded-2xl">
              <p className="text-sm text-slate-400">No games found matching your search filter.</p>
              <button
                onClick={() => {
                  setActiveCategory('all');
                  setSelectedProvider('ALL');
                  setSearchQuery('');
                }}
                className="mt-3 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold rounded-xl"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4">
              {filteredGames.map(game => (
                <GameCard
                  key={game.id}
                  game={game}
                  onPlay={handleLaunchGame}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer with PAGCOR & 21+ Disclaimers */}
      <Footer />

      {/* Floating 24/7 CS Support Chat */}
      <LiveChatWidget />

      {/* Mobile Bottom Navigation Bar (15% mobile sticky cap compliant) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 px-3 py-2 flex items-center justify-around text-[10px] text-slate-400">
        <button
          onClick={() => {
            sounds.playClick();
            setActiveGame(null);
            setActiveCategory('all');
          }}
          className="flex flex-col items-center gap-1 hover:text-amber-400"
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </button>

        <button
          onClick={() => {
            sounds.playClick();
            setPromosOpen(true);
          }}
          className="flex flex-col items-center gap-1 hover:text-amber-400"
        >
          <Gift className="w-4 h-4 text-amber-400" />
          <span>Promos</span>
        </button>

        <button
          onClick={() => handleOpenCashier('deposit')}
          className="flex flex-col items-center -mt-4 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 p-2.5 rounded-full shadow-lg shadow-amber-500/30"
        >
          <PlusCircle className="w-5 h-5 font-black" />
          <span className="font-extrabold text-[9px]">DEPOSIT</span>
        </button>

        <button
          onClick={() => handleLaunchGame(GAMES_CATALOG[0])}
          className="flex flex-col items-center gap-1 hover:text-amber-400"
        >
          <Gamepad2 className="w-4 h-4" />
          <span>Slots</span>
        </button>

        <button
          onClick={() => (user.isLoggedIn ? handleOpenCashier('history') : handleOpenAuth('login'))}
          className="flex flex-col items-center gap-1 hover:text-amber-400"
        >
          <User className="w-4 h-4" />
          <span>{user.isLoggedIn ? 'Account' : 'Login'}</span>
        </button>
      </nav>

      {/* Modals */}
      <CashierModal
        isOpen={cashierOpen}
        onClose={() => setCashierOpen(false)}
        userBalance={user.balance}
        onBalanceUpdate={handleBalanceUpdate}
        transactions={transactions}
        onRefreshWallet={handleRefreshWallet}
        initialTab={cashierTab}
      />

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        initialMode={authMode}
      />

      <PromotionsModal
        isOpen={promosOpen}
        onClose={() => setPromosOpen(false)}
        promotions={promotions}
        onDepositClick={() => handleOpenCashier('deposit')}
      />

      <VIPModal
        isOpen={vipOpen}
        onClose={() => setVipOpen(false)}
        currentLevel={user.vipLevel}
        currentPoints={user.vipPoints}
        levels={vipTiers}
      />
    </div>
  );
}
