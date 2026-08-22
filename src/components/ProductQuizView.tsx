import React, { useState, useEffect, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  CheckCircle2,
  RotateCcw,
  BookOpen,
  Search,
  Sliders,
  Save,
  Check,
  AlertCircle,
  Trophy,
  History,
  ThumbsUp,
  ChevronDown,
  ChevronUp,
  Square,
  BarChart3,
  Medal,
  CheckSquare2,
  ArrowRight,
  Layers,
  Trash2,
  ShieldAlert,
  Flame,
  Award,
  Clock
} from 'lucide-react';
import {
  QUIZ_PRODUCTS,
  QUIZ_DIMENSIONS,
  DEFAULT_QUIZ_ANSWERS,
  PRODUCT_SERIES_GROUPS,
  DEFAULT_LEADERBOARD,
  LeaderboardEntry,
  QuizSubmissionHistoryItem
} from '../data/productQuizData';
import { AppUser } from '../types';

interface ProductQuizViewProps {
  currentUser: AppUser | null;
}

interface ProductCompletionInfo {
  isComplete: boolean;
  filledDimCount: number;
  status: 'completed' | 'in_progress' | 'empty';
}

const STORAGE_QUIZ_CUSTOM_ANSWERS = 'hmht_quiz_answers_custom_v4';
const STORAGE_QUIZ_DRAFT_ANSWERS = 'hmht_quiz_user_draft_answers_v4';
const STORAGE_QUIZ_DRAFT_META = 'hmht_quiz_user_draft_meta_v4';
const STORAGE_QUIZ_LEADERBOARD = 'hmht_quiz_leaderboard_v4';
const STORAGE_QUIZ_USER_HISTORY = 'hmht_quiz_user_history_v4';

export const ProductQuizView: React.FC<ProductQuizViewProps> = ({ currentUser }) => {
  // Modes: 'training' (分类实训模式) | 'leaderboard' (排行榜) | 'history' (提交历史) | 'admin_config' (标准答案后台)
  const [activeTab, setActiveTab] = useState<'training' | 'leaderboard' | 'history' | 'admin_config'>('training');
  const [brandFilter, setBrandFilter] = useState<'all' | 'nxw' | 'ctm'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>(QUIZ_PRODUCTS[0]?.id || 'am');

  // Custom standard answers (Admin editable)
  const [answersMap, setAnswersMap] = useState<Record<string, Record<string, string[]>>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_QUIZ_CUSTOM_ANSWERS);
      return saved ? JSON.parse(saved) : DEFAULT_QUIZ_ANSWERS;
    } catch {
      return DEFAULT_QUIZ_ANSWERS;
    }
  });

  // User draft selections for all products: { [productId]: { cat: [...], use: [...], stage: [...], func: [...], ingr: [...] } }
  const [userAllSelections, setUserAllSelections] = useState<Record<string, Record<string, string[]>>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_QUIZ_DRAFT_ANSWERS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load quiz draft:', e);
    }
    // Initialize empty for all products
    const initial: Record<string, Record<string, string[]>> = {};
    QUIZ_PRODUCTS.forEach((p) => {
      initial[p.id] = { cat: [], use: [], stage: [], func: [], ingr: [] };
    });
    return initial;
  });

  // Leaderboard data
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_QUIZ_LEADERBOARD);
      return saved ? JSON.parse(saved) : DEFAULT_LEADERBOARD;
    } catch {
      return DEFAULT_LEADERBOARD;
    }
  });

  // User personal submission history
  const [submissionHistory, setSubmissionHistory] = useState<QuizSubmissionHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_QUIZ_USER_HISTORY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Grading Result State
  const [gradedResult, setGradedResult] = useState<QuizSubmissionHistoryItem | null>(null);
  const [isGradedView, setIsGradedView] = useState(false);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [expandedSeries, setExpandedSeries] = useState<Record<string, boolean>>({
    series_bn: true,
    series_sk: true,
    series_ao_bio: true,
    series_ao_foliar: false,
    series_df: false,
    series_nutri: false,
    series_ctm: true,
  });

  // Auto-save notification feedback
  const [autoSaveTick, setAutoSaveTick] = useState(false);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(() => localStorage.getItem(STORAGE_QUIZ_DRAFT_META));

  // Time tracking
  const [startTime] = useState<number>(() => Date.now());

  // Admin temporary draft state
  const [adminDraftSelections, setAdminDraftSelections] = useState<Record<string, string[]>>({
    cat: [],
    use: [],
    stage: [],
    func: [],
    ingr: [],
  });
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const isAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';
  const isInitialMountRef = useRef(true);

  // Persist user draft automatically to localStorage whenever userAllSelections changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_QUIZ_DRAFT_ANSWERS, JSON.stringify(userAllSelections));
      if (isInitialMountRef.current) {
        isInitialMountRef.current = false;
        return;
      }
      setAutoSaveTick(true);
      const t = setTimeout(() => setAutoSaveTick(false), 1200);
      return () => clearTimeout(t);
    } catch (e) {
      console.error('Error auto-saving quiz draft:', e);
    }
  }, [userAllSelections]);

  // Persist leaderboard
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_QUIZ_LEADERBOARD, JSON.stringify(leaderboard));
    } catch (e) {
      console.error('Error saving leaderboard:', e);
    }
  }, [leaderboard]);

  // Persist history
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_QUIZ_USER_HISTORY, JSON.stringify(submissionHistory));
    } catch (e) {
      console.error('Error saving history:', e);
    }
  }, [submissionHistory]);

  // Sync Admin editing state when product changes in admin mode
  useEffect(() => {
    if (activeTab === 'admin_config') {
      const prodAns = answersMap[selectedProductId] || { cat: [], use: [], stage: [], func: [], ingr: [] };
      setAdminDraftSelections({
        cat: prodAns.cat || [],
        use: prodAns.use || [],
        stage: prodAns.stage || [],
        func: prodAns.func || [],
        ingr: prodAns.ingr || [],
      });
    }
  }, [selectedProductId, activeTab, answersMap]);

  // Current active product
  const currentProduct = useMemo(() => {
    return QUIZ_PRODUCTS.find((p) => p.id === selectedProductId) || QUIZ_PRODUCTS[0];
  }, [selectedProductId]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return QUIZ_PRODUCTS.filter((p) => {
      const matchBrand = brandFilter === 'all' || p.brand === brandFilter;
      const matchQuery = !searchQuery.trim() || p.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchBrand && matchQuery;
    });
  }, [brandFilter, searchQuery]);

  // Check completion status for each product
  const productCompletionMap = useMemo<Record<string, ProductCompletionInfo>>(() => {
    const map: Record<string, ProductCompletionInfo> = {};
    QUIZ_PRODUCTS.forEach((p) => {
      const pSelections = userAllSelections[p.id] || {};
      let filledCount = 0;
      QUIZ_DIMENSIONS.forEach((dim) => {
        if (pSelections[dim.id] && pSelections[dim.id].length > 0) {
          filledCount++;
        }
      });

      map[p.id] = {
        isComplete: filledCount === QUIZ_DIMENSIONS.length,
        filledDimCount: filledCount,
        status: filledCount === QUIZ_DIMENSIONS.length ? 'completed' : filledCount > 0 ? 'in_progress' : 'empty',
      };
    });
    return map;
  }, [userAllSelections]);

  // Total completed products count across all 31 products
  const totalCompletedCount = useMemo(() => {
    const values: ProductCompletionInfo[] = Object.values(productCompletionMap);
    return values.filter((item) => item.isComplete).length;
  }, [productCompletionMap]);

  const totalProgressPercent = Math.round((totalCompletedCount / QUIZ_PRODUCTS.length) * 100);

  // Toggle option selection in current active product
  const handleToggleOption = (dimId: string, optId: string) => {
    if (activeTab === 'admin_config') {
      setAdminDraftSelections((prev) => {
        const currentList = prev[dimId] || [];
        const exists = currentList.includes(optId);
        const nextList = exists ? currentList.filter((id) => id !== optId) : [...currentList, optId];
        return { ...prev, [dimId]: nextList };
      });
      return;
    }

    if (isGradedView) {
      setIsGradedView(false);
    }

    const pId = currentProduct.id;
    setUserAllSelections((prev) => {
      const prodAns = prev[pId] || { cat: [], use: [], stage: [], func: [], ingr: [] };
      const currentList = prodAns[dimId] || [];
      const exists = currentList.includes(optId);
      const nextList = exists ? currentList.filter((id) => id !== optId) : [...currentList, optId];
      return {
        ...prev,
        [pId]: {
          ...prodAns,
          [dimId]: nextList,
        },
      };
    });
  };

  // Find the first unfinished product and jump to it
  const handleJumpToFirstUnfinished = () => {
    const unfinished = QUIZ_PRODUCTS.find((p) => !productCompletionMap[p.id]?.isComplete);
    if (unfinished) {
      setSelectedProductId(unfinished.id);
      setValidationWarning(null);
    }
  };

  // Calculate Product Score out of 10 points
  const calculateSingleProductScore = (pId: string, userAns: Record<string, string[]>, stdAns: Record<string, string[]>) => {
    let totalStdItems = 0;
    let correctSelected = 0;
    let wrongSelected = 0;
    let missedCount = 0;

    QUIZ_DIMENSIONS.forEach((dim) => {
      const stdList = stdAns[dim.id] || [];
      const userList = userAns[dim.id] || [];

      totalStdItems += stdList.length;

      // Correctly selected
      userList.forEach((optId) => {
        if (stdList.includes(optId)) {
          correctSelected++;
        } else {
          wrongSelected++;
        }
      });

      // Missed standard items
      stdList.forEach((optId) => {
        if (!userList.includes(optId)) {
          missedCount++;
        }
      });
    });

    if (totalStdItems === 0) totalStdItems = 1;

    const basePositive = (correctSelected / totalStdItems) * 10;
    const penalty = wrongSelected * 0.8;
    const rawScore = Math.max(0, basePositive - penalty);
    const finalScore = Math.min(10, Math.round(rawScore * 10) / 10);
    const integerScore = Math.round(finalScore);
    const percentage = Math.min(100, Math.max(0, Math.round((finalScore / 10) * 100)));

    return {
      score: finalScore,
      integerScore,
      maxScore: 10,
      percentage,
      correctCount: correctSelected,
      wrongCount: wrongSelected,
      missedCount,
      totalStdItems,
    };
  };

  // Trigger celebration fireworks & confetti
  const triggerCelebrationConfetti = () => {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
      colors: ['#10B981', '#14B8A6', '#F59E0B', '#6366F1'],
    });
    fire(0.2, {
      spread: 60,
      colors: ['#EC4899', '#3B82F6', '#8B5CF6', '#10B981'],
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      colors: ['#FBBF24', '#34D399', '#60A5FA'],
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  };

  // Execute Submission & Grading
  const handleSubmitGrading = () => {
    // Check if all 31 products are 100% completed
    const unfinishedProducts = QUIZ_PRODUCTS.filter((p) => !productCompletionMap[p.id]?.isComplete);
    if (unfinishedProducts.length > 0) {
      setValidationWarning(
        `尚有 ${unfinishedProducts.length} 款产品未完成 5 维作答（如：${unfinishedProducts
          .slice(0, 3)
          .map((p) => p.name)
          .join('、')}${unfinishedProducts.length > 3 ? '等' : ''}）。需全部勾选完成后方可提交判分！`
      );
      return;
    }

    setValidationWarning(null);

    // Compute Product Scores & Series Scores
    const productScores: QuizSubmissionHistoryItem['productScores'] = {};
    let totalScoreSum = 0;
    const maxScoreTotal = QUIZ_PRODUCTS.length * 10; // 310 分

    QUIZ_PRODUCTS.forEach((p) => {
      const userAns = userAllSelections[p.id] || { cat: [], use: [], stage: [], func: [], ingr: [] };
      const stdAns = answersMap[p.id] || { cat: [], use: [], stage: [], func: [], ingr: [] };
      const res = calculateSingleProductScore(p.id, userAns, stdAns);

      productScores[p.id] = {
        productId: p.id,
        productName: p.name,
        score: res.score,
        maxScore: 10,
        percentage: res.percentage,
        correctCount: res.correctCount,
        wrongCount: res.wrongCount,
        missedCount: res.missedCount,
      };

      totalScoreSum += res.score;
    });

    // Compute Series Scores
    const seriesScores: QuizSubmissionHistoryItem['seriesScores'] = {};
    PRODUCT_SERIES_GROUPS.forEach((sg) => {
      let sgScore = 0;
      const sgMax = sg.productIds.length * 10;
      sg.productIds.forEach((pid) => {
        sgScore += productScores[pid]?.score || 0;
      });
      const sgPercentage = sgMax > 0 ? Math.round((sgScore / sgMax) * 100) : 0;
      seriesScores[sg.id] = {
        seriesId: sg.id,
        name: sg.name,
        score: Math.round(sgScore * 10) / 10,
        maxScore: sgMax,
        percentage: sgPercentage,
        productCount: sg.productIds.length,
      };
    });

    const finalTotalScore = Math.round(totalScoreSum * 10) / 10;
    const finalPercentage = Math.round((finalTotalScore / maxScoreTotal) * 100);
    const durationSeconds = Math.max(30, Math.round((Date.now() - startTime) / 1000));

    const nowStr = new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    const submissionItem: QuizSubmissionHistoryItem = {
      id: 'sub-' + Date.now(),
      userId: currentUser?.id || 'usr-guest',
      userName: currentUser?.realName || currentUser?.username || '测试农艺师',
      submittedAt: nowStr,
      totalScore: finalTotalScore,
      maxScore: maxScoreTotal,
      percentage: finalPercentage,
      durationSeconds,
      completedCount: QUIZ_PRODUCTS.length,
      totalProductsCount: QUIZ_PRODUCTS.length,
      seriesScores,
      productScores,
      userSelectionsSnapshot: JSON.parse(JSON.stringify(userAllSelections)),
    };

    setGradedResult(submissionItem);
    setIsGradedView(true);

    // Save to user history
    setSubmissionHistory((prev) => [submissionItem, ...prev]);
    localStorage.removeItem(STORAGE_QUIZ_DRAFT_ANSWERS);
    localStorage.removeItem(STORAGE_QUIZ_DRAFT_META);
    setDraftSavedAt(null);

    // Update / Insert into Leaderboard
    const newLeaderboardEntry: LeaderboardEntry = {
      id: 'lb-' + Date.now(),
      userId: currentUser?.id || 'usr-guest',
      userName: currentUser?.realName || currentUser?.username || '我（当前提交）',
      avatarBg: 'bg-emerald-600',
      roleTitle: currentUser?.role === 'super_admin' ? '总系统管理员' : currentUser?.department || '水肥技术顾问',
      department: currentUser?.company || '惠民皓天技术部',
      score: finalTotalScore,
      maxScore: maxScoreTotal,
      percentage: finalPercentage,
      durationSeconds,
      submittedAt: nowStr,
      isCurrentUser: true,
    };

    setLeaderboard((prev) => {
      const combined = [...prev.filter((item) => !item.isCurrentUser || item.userId !== currentUser?.id), newLeaderboardEntry];
      combined.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.percentage - a.percentage;
      });
      return combined.map((entry, idx) => ({ ...entry, rank: idx + 1 }));
    });

    // Launch celebration
    setShowCelebrationModal(true);
    triggerCelebrationConfetti();
  };

  const handleSaveDraft = () => {
    const timestamp = new Date().toLocaleString('zh-CN', { hour12: false });
    localStorage.setItem(STORAGE_QUIZ_DRAFT_ANSWERS, JSON.stringify(userAllSelections));
    localStorage.setItem(STORAGE_QUIZ_DRAFT_META, timestamp);
    setDraftSavedAt(timestamp);
    setActionSuccessMsg('已保存到草稿箱，下次打开可继续上次勾选位置。');
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handleReopenSubmission = (item: QuizSubmissionHistoryItem) => {
    if (!item.userSelectionsSnapshot) return;
    setUserAllSelections(JSON.parse(JSON.stringify(item.userSelectionsSnapshot)));
    setSelectedProductId(QUIZ_PRODUCTS[0]?.id || '');
    setGradedResult(null);
    setIsGradedView(false);
    setActiveTab('training');
    setActionSuccessMsg('已重新打开该次提交的作答内容，可继续修改。');
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  // In-app confirmation modal state (replaces iframe-incompatible window.confirm)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    confirmStyle?: 'danger' | 'primary';
    onConfirm: () => void;
  } | null>(null);

  // Admin delete individual leaderboard entry
  const handleDeleteLeaderboardEntry = (entryId: string, targetName: string) => {
    setConfirmModal({
      isOpen: true,
      title: '删除排行榜记录',
      message: `确定要从排行榜中移除「${targetName}」的测评成绩记录吗？`,
      confirmText: '确认删除',
      confirmStyle: 'danger',
      onConfirm: () => {
        setLeaderboard((prev) => {
          const updated = prev.filter((item) => item.id !== entryId);
          try {
            localStorage.setItem(STORAGE_QUIZ_LEADERBOARD, JSON.stringify(updated));
          } catch (e) {
            console.error(e);
          }
          return updated.map((entry, idx) => ({ ...entry, rank: idx + 1 }));
        });
        setActionSuccessMsg(`已成功删除「${targetName}」的排行榜记录！`);
        setTimeout(() => setActionSuccessMsg(null), 3000);
        setConfirmModal(null);
      },
    });
  };

  // Admin clear all leaderboard records
  const handleClearAllLeaderboard = () => {
    setConfirmModal({
      isOpen: true,
      title: '清空排行榜所有记录',
      message: '确定要清空排行榜中的所有考核成绩记录吗？包括示范人员和所有历史榜单。',
      confirmText: '确认清空全部',
      confirmStyle: 'danger',
      onConfirm: () => {
        setLeaderboard([]);
        try {
          localStorage.setItem(STORAGE_QUIZ_LEADERBOARD, JSON.stringify([]));
        } catch (e) {
          console.error(e);
        }
        setActionSuccessMsg('已成功清空排行榜所有记录！');
        setTimeout(() => setActionSuccessMsg(null), 3000);
        setConfirmModal(null);
      },
    });
  };

  // Admin reset leaderboard to default demo data
  const handleResetLeaderboardToDefault = () => {
    setConfirmModal({
      isOpen: true,
      title: '恢复初始示范榜单',
      message: '确定要重新恢复系统初始预设示范记录吗？',
      confirmText: '确认恢复',
      confirmStyle: 'primary',
      onConfirm: () => {
        const restored = DEFAULT_LEADERBOARD.map((item, idx) => ({ ...item, rank: idx + 1 }));
        setLeaderboard(restored);
        try {
          localStorage.setItem(STORAGE_QUIZ_LEADERBOARD, JSON.stringify(restored));
        } catch (e) {
          console.error(e);
        }
        setActionSuccessMsg('已恢复初始榜单记录！');
        setTimeout(() => setActionSuccessMsg(null), 3000);
        setConfirmModal(null);
      },
    });
  };

  // Delete individual submission history item
  const handleDeleteHistoryItem = (itemId: string) => {
    setConfirmModal({
      isOpen: true,
      title: '删除历史记录',
      message: '确定要删除这条个人测评提交历史记录吗？',
      confirmText: '确认删除',
      confirmStyle: 'danger',
      onConfirm: () => {
        setSubmissionHistory((prev) => {
          const updated = prev.filter((item) => item.id !== itemId);
          try {
            localStorage.setItem(STORAGE_QUIZ_USER_HISTORY, JSON.stringify(updated));
          } catch (e) {
            console.error(e);
          }
          return updated;
        });
        setActionSuccessMsg('已成功删除该条历史记录！');
        setTimeout(() => setActionSuccessMsg(null), 3000);
        setConfirmModal(null);
      },
    });
  };

  // Clear all submission history
  const handleClearAllHistory = () => {
    setConfirmModal({
      isOpen: true,
      title: '清空个人提交历史',
      message: '确定要清空您的所有个人测评提交历史记录吗？',
      confirmText: '确认清空',
      confirmStyle: 'danger',
      onConfirm: () => {
        setSubmissionHistory([]);
        try {
          localStorage.removeItem(STORAGE_QUIZ_USER_HISTORY);
        } catch (e) {
          console.error(e);
        }
        setActionSuccessMsg('已清空个人所有历史记录！');
        setTimeout(() => setActionSuccessMsg(null), 3000);
        setConfirmModal(null);
      },
    });
  };

  // Save Admin Standard Answers
  const handleSaveAdminAnswers = () => {
    if (!currentProduct) return;
    const updated = {
      ...answersMap,
      [currentProduct.id]: adminDraftSelections,
    };
    setAnswersMap(updated);
    localStorage.setItem(STORAGE_QUIZ_CUSTOM_ANSWERS, JSON.stringify(updated));
    setSaveSuccessMsg(`已成功保存「${currentProduct.name}」的五维官方标准分类！`);
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  // Reset current product draft
  const handleResetCurrentProduct = () => {
    const pId = currentProduct.id;
    setUserAllSelections((prev) => ({
      ...prev,
      [pId]: { cat: [], use: [], stage: [], func: [], ingr: [] },
    }));
  };

  // Format seconds to mm:ss
  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m > 0 ? `${m} 分 ` : ''}${s} 秒`;
  };

  // Toggle series accordion in graded view
  const toggleSeriesAccordion = (seriesId: string) => {
    setExpandedSeries((prev) => ({
      ...prev,
      [seriesId]: !prev[seriesId],
    }));
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5 animate-in fade-in duration-200">
      {/* Top Banner & Control Bar */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white rounded-3xl p-5 sm:p-7 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>农小蛙 · 惠民皓天 肥料全系产品 5 维分类实训中心</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-3">
            <span>肥料产品五维分类实训与考核中心</span>
            {isGradedView && (
              <span className="px-3 py-0.5 text-xs font-bold bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl">
                已生成测评成绩
              </span>
            )}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
            全面覆盖农小蛙 (26款) 与 锄头猫 (5款) 全系共 31 款肥料。作答实时自动暂存防丢失，全部勾选后提交智能判分，按系列合并核算得分与排行榜竞逐。
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/80 shrink-0">
          <button
            onClick={() => {
              setActiveTab('training');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'training'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <CheckSquare2 className="w-3.5 h-3.5" />
            <span>分类实训答题</span>
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'leaderboard'
                ? 'bg-amber-500 text-white shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>全员排行榜</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>我的提交记录</span>
            {submissionHistory.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-blue-800 text-[10px] flex items-center justify-center">
                {submissionHistory.length}
              </span>
            )}
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin_config')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'admin_config'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>标准答案后台</span>
            </button>
          )}
        </div>
      </div>

      {/* Action Success Toast Feedback */}
      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button
            onClick={() => setActionSuccessMsg(null)}
            className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Progress & Overall Status Bar in Training Mode */}
      {activeTab === 'training' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Enhanced Extra Long Progress Counter & Visual Bar */}
          <div className="flex-1 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-800 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-black text-slate-900">实训作答考核总进度：</span>
                <span className="text-emerald-700 font-black text-base font-mono">
                  {totalCompletedCount} / {QUIZ_PRODUCTS.length} 款
                </span>
                <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full text-xs border border-emerald-200">
                  已完成 {totalProgressPercent}%
                </span>
              </span>

              <div className="flex items-center gap-3">
                {autoSaveTick && (
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <Save className="w-3.5 h-3.5" />
                    <span>已实时自动暂存</span>
                  </span>
                )}
                {draftSavedAt && <span className="text-[11px] text-blue-600 font-semibold">草稿：{draftSavedAt}</span>}
                <span className="text-slate-400 font-medium text-[11px]">
                  共需完成全库 31 款产品分类
                </span>
              </div>
            </div>

            {/* Prominent Long Progress Bar */}
            <div className="relative w-full h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${totalProgressPercent}%` }}
              />
            </div>

            {/* Quick Series Milestone Ticks */}
            <div className="flex justify-between text-[10px] text-slate-400 font-mono px-0.5">
              <span>0% 初始</span>
              <span>25% 初显成效</span>
              <span>50% 半程突破</span>
              <span>75% 胜券在握</span>
              <span>100% 全库就绪</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
            {totalCompletedCount < QUIZ_PRODUCTS.length ? (
              <button
                onClick={handleJumpToFirstUnfinished}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="快速定位到下一个未完成的产品"
              >
                <ArrowRight className="w-4 h-4 text-slate-500" />
                <span>跳至未作答产品</span>
              </button>
            ) : null}

            <button
              onClick={handleSaveDraft}
              className="px-4 py-3 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-black shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>暂存草稿</span>
            </button>

            <button
              onClick={handleSubmitGrading}
              className={`px-6 py-3 rounded-2xl text-xs font-black shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                totalCompletedCount === QUIZ_PRODUCTS.length
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-98 animate-pulse ring-4 ring-emerald-500/20'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {totalCompletedCount === QUIZ_PRODUCTS.length
                  ? '提交全库答卷并智能判分'
                  : `提交判分 (${totalCompletedCount}/${QUIZ_PRODUCTS.length})`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Validation Warning Alert */}
      {validationWarning && (
        <div className="p-4 bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{validationWarning}</span>
          </div>
          <button
            onClick={handleJumpToFirstUnfinished}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer"
          >
            立即前往补全
          </button>
        </div>
      )}

      {/* TAB 1: MAIN TRAINING & CLASSIFICATION VIEW */}
      {activeTab === 'training' && (
        <div className="space-y-6">
          {/* Main 2-Column Responsive Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Product Selection Pool (4 Cols) — EXPANDED TO OCCUPY FULL HEIGHT */}
            <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col h-[calc(100vh-220px)] min-h-[640px] max-h-[820px]">
              <div className="space-y-3 shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-600" />
                    <span>肥料产品题库 ({filteredProducts.length})</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    已完成 {totalCompletedCount}/{QUIZ_PRODUCTS.length}
                  </span>
                </div>

                {/* Brand Filter */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setBrandFilter('all')}
                    className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      brandFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    全部品牌 ({QUIZ_PRODUCTS.length})
                  </button>
                  <button
                    onClick={() => setBrandFilter('nxw')}
                    className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      brandFilter === 'nxw' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    农小蛙 (26款)
                  </button>
                  <button
                    onClick={() => setBrandFilter('ctm')}
                    className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      brandFilter === 'ctm' ? 'bg-teal-600 text-white shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    锄头猫 (5款)
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索产品（如：傲生、蓓能、高钙）..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 text-xs rounded-xl border border-slate-200 focus:border-emerald-500 focus:bg-white outline-hidden font-medium"
                  />
                </div>
              </div>

              {/* Product Pool List — Fully Responsive Scroll Area Filling Empty Space */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 mt-3 divide-y divide-slate-100">
                {filteredProducts.map((p, idx) => {
                  const isSelected = selectedProductId === p.id;
                  const comp = productCompletionMap[p.id];
                  const isComplete = comp?.isComplete;
                  const isPartiallyFilled = comp?.status === 'in_progress';

                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProductId(p.id)}
                      className={`p-2.5 sm:p-3 rounded-2xl cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-emerald-50/90 border border-emerald-500 shadow-2xs'
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Number Index */}
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                            p.brand === 'nxw' ? 'bg-emerald-100 text-emerald-800' : 'bg-teal-100 text-teal-800'
                          }`}
                        >
                          {idx + 1}
                        </span>

                        <div className="min-w-0 truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800 text-xs truncate">{p.name}</span>
                            <span
                              className={`px-1 py-0.2 text-[9px] font-bold rounded shrink-0 ${
                                p.brand === 'nxw'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-teal-100 text-teal-700'
                              }`}
                            >
                              {p.brand === 'nxw' ? '农小蛙' : '锄头猫'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate">
                            {p.seriesName || '标准肥系'}
                          </p>
                        </div>
                      </div>

                      {/* State Indicator Icon */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isComplete ? (
                          <div
                            className="flex items-center gap-1 text-emerald-600 bg-emerald-100/80 px-2 py-0.5 rounded-full text-[10px] font-bold"
                            title="该产品 5 维度已全部勾选作答完成"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="hidden sm:inline">已填完</span>
                          </div>
                        ) : isPartiallyFilled ? (
                          <div
                            className="flex items-center gap-1 text-amber-600 bg-amber-100/80 px-2 py-0.5 rounded-full text-[10px] font-bold"
                            title={`已勾选 ${comp.filledDimCount}/5 维度`}
                          >
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>{comp.filledDimCount}/5</span>
                          </div>
                        ) : (
                          <div
                            className="flex items-center gap-1 text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full text-[10px] font-medium"
                            title="尚未开始作答"
                          >
                            <Square className="w-3.5 h-3.5 text-slate-400" />
                            <span className="hidden sm:inline">未选</span>
                          </div>
                        )}

                        {isSelected && <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Card Footer */}
              <div className="pt-3 mt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>已完成: {totalCompletedCount} 款</span>
                </span>
                <span className="font-mono text-emerald-600 font-bold">
                  {totalCompletedCount === QUIZ_PRODUCTS.length ? '全部就绪' : `待完成 ${QUIZ_PRODUCTS.length - totalCompletedCount} 款`}
                </span>
              </div>
            </div>

            {/* Right Column: 5-Dimension Classification Panels (8 Cols) */}
            <div className="lg:col-span-8 space-y-5">
              {/* Active Product Header */}
              <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-black text-lg shadow-sm">
                    {currentProduct?.name.slice(0, 1) || '肥'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-slate-900">{currentProduct?.name}</h3>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg">
                        {currentProduct?.brand === 'nxw' ? '农小蛙系列' : '锄头猫系列'}
                      </span>
                      {productCompletionMap[currentProduct.id]?.isComplete ? (
                        <span className="px-2 py-0.5 bg-emerald-600 text-white text-[11px] font-bold rounded-lg flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>5维已填满</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[11px] font-bold rounded-lg">
                          已填 {productCompletionMap[currentProduct.id]?.filledDimCount || 0} / 5 维
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      所属系列：<strong className="text-slate-600">{currentProduct?.seriesName || '核心单品'}</strong> · 作答后实时自动暂存
                    </p>
                  </div>
                </div>

                {/* Operations & Navigation */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleResetCurrentProduct}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                    title="重置当前产品已选答案"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>清空本品</span>
                  </button>

                  <button
                    onClick={() => {
                      const nextIdx = (QUIZ_PRODUCTS.findIndex((p) => p.id === currentProduct.id) + 1) % QUIZ_PRODUCTS.length;
                      setSelectedProductId(QUIZ_PRODUCTS[nextIdx].id);
                    }}
                    className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>下一款</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 5 Dimensions Grid */}
              <div className="space-y-4">
                {QUIZ_DIMENSIONS.map((dim) => {
                  const currentSelections = userAllSelections[currentProduct.id]?.[dim.id] || [];
                  const isDimFilled = currentSelections.length > 0;

                  return (
                    <div
                      key={dim.id}
                      className="bg-white rounded-3xl border border-slate-200 p-5 space-y-3 shadow-2xs hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              isDimFilled ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-slate-300'
                            }`}
                          />
                          <h4 className="font-black text-slate-800 text-xs sm:text-sm flex items-center gap-1.5">
                            <span>{dim.title}</span>
                            {isDimFilled ? (
                              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-bold">
                                已选 {currentSelections.length} 项
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                                未选择
                              </span>
                            )}
                          </h4>
                        </div>

                        <span className="text-[11px] text-slate-400">可多选</span>
                      </div>

                      {/* Option Chips */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {dim.options.map((opt) => {
                          const isSelected = currentSelections.includes(opt.id);

                          let badgeStyle =
                            'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300';

                          if (isSelected) {
                            badgeStyle =
                              'bg-emerald-50 text-emerald-900 border-emerald-500 font-bold shadow-2xs ring-1 ring-emerald-400';
                          }

                          return (
                            <button
                              key={opt.id}
                              onClick={() => handleToggleOption(dim.id, opt.id)}
                              className={`px-3 py-2 rounded-2xl text-xs border transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${badgeStyle}`}
                            >
                              <span
                                className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                                  isSelected ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white'
                                }`}
                              >
                                {isSelected ? '✓' : ''}
                              </span>
                              <span>{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Graded Series Breakdown Section (Shown after submission or when viewing graded results) */}
          {gradedResult && (
            <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 space-y-6 shadow-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-bold mb-1">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>实训考核测评结果（相同系列已自动合并核算）</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black">
                    实训总得分：
                    <span className="text-amber-400 ml-1">
                      {gradedResult.totalScore} / {gradedResult.maxScore} 分
                    </span>
                    <span className="text-sm font-semibold text-slate-400 ml-2">
                      (正确率 {gradedResult.percentage}%)
                    </span>
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveTab('leaderboard')}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-2xl text-xs shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Trophy className="w-4 h-4" />
                    <span>查看全员荣耀榜</span>
                  </button>
                </div>
              </div>

              {/* Total Score Long Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>总得分考核综合掌握进度</span>
                  </span>
                  <span className="font-mono text-amber-400 text-sm font-black">{gradedResult.percentage}%</span>
                </div>
                <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700 shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-400 rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${gradedResult.percentage}%` }}
                  />
                </div>
              </div>

              {/* Series Merged Score Cards */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>各肥料系列合并得分与产品明细（点击可展开/折叠各单品得分）：</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PRODUCT_SERIES_GROUPS.map((sg) => {
                    const sgRes = gradedResult.seriesScores[sg.id];
                    if (!sgRes) return null;
                    const isExpanded = expandedSeries[sg.id];

                    return (
                      <div
                        key={sg.id}
                        className="bg-slate-800/90 rounded-2xl border border-slate-700 p-4.5 space-y-3"
                      >
                        {/* Series Header */}
                        <div
                          onClick={() => toggleSeriesAccordion(sg.id)}
                          className="flex items-center justify-between cursor-pointer hover:opacity-90"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-sm text-white">{sg.name}</span>
                              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-md text-[10px] font-bold border border-emerald-500/30">
                                {sg.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{sg.description}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <div className="text-xs font-black text-amber-400">
                                {sgRes.score} / {sgRes.maxScore} 分
                              </div>
                              <div className="text-[10px] text-slate-400">{sgRes.percentage}% 达成</div>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </div>

                        {/* Series Progress Bar */}
                        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                            style={{ width: `${sgRes.percentage}%` }}
                          />
                        </div>

                        {/* Expanded Individual Product Scores */}
                        {isExpanded && (
                          <div className="pt-2 border-t border-slate-700/80 space-y-2">
                            {sg.productIds.map((pid) => {
                              const pScore = gradedResult.productScores[pid];
                              if (!pScore) return null;

                              return (
                                <div
                                  key={pid}
                                  className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-200">{pScore.productName}</span>
                                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                      <span className="text-emerald-400">对 {pScore.correctCount}</span>
                                      {pScore.wrongCount > 0 && (
                                        <span className="text-rose-400">错 {pScore.wrongCount}</span>
                                      )}
                                      {pScore.missedCount > 0 && (
                                        <span className="text-amber-400">漏 {pScore.missedCount}</span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    {/* Individual Progress Bar */}
                                    <div className="w-20 sm:w-28 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-amber-400 rounded-full"
                                        style={{ width: `${pScore.percentage}%` }}
                                      />
                                    </div>
                                    <span className="font-black text-amber-300 font-mono">
                                      {pScore.score} / {pScore.maxScore} 分
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LEADERBOARD (全员排行榜) */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top 3 Podium Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-md">
            <div className="text-center max-w-xl mx-auto mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-black mb-2">
                <Trophy className="w-4 h-4" />
                <span>实训全员考核荣耀榜</span>
              </div>
              <h3 className="text-2xl font-black">肥料五维分类实训总排行榜</h3>
              <p className="text-xs text-slate-400 mt-1">
                根据 31 款肥料 5 维属性定位考核得分与正确率综合排序
              </p>
            </div>

            {/* Top 3 Visual Podium */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto pt-2">
              {/* 2nd Place: Silver */}
              {leaderboard[1] && (
                <div className="order-2 sm:order-1 bg-slate-800/80 rounded-2xl border border-slate-700/80 p-5 text-center flex flex-col items-center justify-between relative overflow-hidden">
                  <div className="absolute top-3 left-3 text-xl">🥈</div>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteLeaderboardEntry(leaderboard[1].id, leaderboard[1].userName)}
                      className="absolute top-3 right-3 p-1.5 bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                      title="管理员删除此记录"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-300 to-slate-500 text-slate-900 font-black text-lg flex items-center justify-center shadow-md mb-2">
                    2
                  </div>
                  <h4 className="font-bold text-white text-sm">{leaderboard[1].userName}</h4>
                  <p className="text-[11px] text-slate-400">{leaderboard[1].department}</p>
                  
                  {/* Score & Long Progress Bar */}
                  <div className="mt-3 pt-3 border-t border-slate-700 w-full space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black text-slate-200">{leaderboard[1].score} 分</span>
                      <span className="text-[11px] text-slate-300 font-mono">达成率 {leaderboard[1].percentage}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-700">
                      <div
                        className="h-full bg-gradient-to-r from-slate-300 to-slate-400 rounded-full"
                        style={{ width: `${leaderboard[1].percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 1st Place: Gold */}
              {leaderboard[0] && (
                <div className="order-1 sm:order-2 bg-gradient-to-b from-amber-900/40 to-slate-800/90 rounded-2xl border-2 border-amber-500/80 p-6 text-center flex flex-col items-center justify-between relative overflow-hidden shadow-lg scale-105">
                  <div className="absolute top-3 left-3 text-2xl animate-bounce">🥇</div>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteLeaderboardEntry(leaderboard[0].id, leaderboard[0].userName)}
                      className="absolute top-3 right-3 p-1.5 bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                      title="管理员删除此记录"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-600 text-amber-950 font-black text-2xl flex items-center justify-center shadow-lg mb-2 ring-4 ring-amber-500/30">
                    1
                  </div>
                  <h4 className="font-black text-amber-200 text-base">{leaderboard[0].userName}</h4>
                  <p className="text-xs text-amber-300/80 font-medium">{leaderboard[0].department}</p>
                  
                  {/* Score & Long Progress Bar */}
                  <div className="mt-3 pt-3 border-t border-amber-500/30 w-full space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-xl font-black text-amber-400">{leaderboard[0].score} 分</span>
                      <span className="text-xs text-amber-300 font-mono font-bold">正确率 {leaderboard[0].percentage}%</span>
                    </div>
                    <div className="w-full h-3.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-amber-500/40 shadow-inner">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 rounded-full shadow-sm"
                        style={{ width: `${leaderboard[0].percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 3rd Place: Bronze */}
              {leaderboard[2] && (
                <div className="order-3 sm:order-3 bg-slate-800/80 rounded-2xl border border-slate-700/80 p-5 text-center flex flex-col items-center justify-between relative overflow-hidden">
                  <div className="absolute top-3 left-3 text-xl">🥉</div>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteLeaderboardEntry(leaderboard[2].id, leaderboard[2].userName)}
                      className="absolute top-3 right-3 p-1.5 bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                      title="管理员删除此记录"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-700 to-amber-900 text-amber-100 font-black text-lg flex items-center justify-center shadow-md mb-2">
                    3
                  </div>
                  <h4 className="font-bold text-white text-sm">{leaderboard[2].userName}</h4>
                  <p className="text-[11px] text-slate-400">{leaderboard[2].department}</p>
                  
                  {/* Score & Long Progress Bar */}
                  <div className="mt-3 pt-3 border-t border-slate-700 w-full space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black text-amber-500">{leaderboard[2].score} 分</span>
                      <span className="text-[11px] text-slate-300 font-mono">达成率 {leaderboard[2].percentage}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-700">
                      <div
                        className="h-full bg-gradient-to-r from-amber-600 to-yellow-600 rounded-full"
                        style={{ width: `${leaderboard[2].percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Admin Management Toolbar (Only visible to admin) */}
          {isAdmin && (
            <div className="bg-gradient-to-r from-rose-50 to-orange-50 rounded-2xl border border-rose-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-rose-950 flex items-center gap-1.5">
                    <span>管理员排行榜管理权限已启用</span>
                    <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded text-[10px] font-bold">
                      Admin
                    </span>
                  </h4>
                  <p className="text-[11px] text-rose-700/80 mt-0.5">
                    您可点击下方表格每行右侧【删除】移除指定记录（如张总、李工等测试示范人员），或一键清空。
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleResetLeaderboardToDefault}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="恢复系统初始预设示例人员记录"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>恢复初始示例</span>
                </button>

                <button
                  onClick={handleClearAllLeaderboard}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="清空排行榜中所有记录"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>清空全部榜单记录</span>
                </button>
              </div>
            </div>
          )}

          {/* Full Leaderboard Table */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Medal className="w-4 h-4 text-emerald-600" />
                <span>全员考核名次与进度总览 ({leaderboard.length} 人)</span>
              </h4>
              <span className="text-xs text-slate-400">
                按综合得分高低排序 · 满分 310 分
              </span>
            </div>

            {leaderboard.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <Trophy className="w-12 h-12 mx-auto text-slate-300" />
                <p className="text-sm font-medium">排行榜暂无记录，可完成实训答题后提交生成第一条记录！</p>
                {isAdmin && (
                  <button
                    onClick={handleResetLeaderboardToDefault}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    恢复预设示范榜单
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400">
                      <th className="pb-3 pl-3 font-semibold w-12">名次</th>
                      <th className="pb-3 font-semibold">学员/农艺师</th>
                      <th className="pb-3 font-semibold">所属部门/基地</th>
                      <th className="pb-3 font-semibold">总得分</th>
                      <th className="pb-3 font-semibold">正确率</th>
                      <th className="pb-3 font-semibold min-w-[220px] sm:min-w-[280px]">考核掌握综合进度条 (310分)</th>
                      <th className="pb-3 font-semibold">提交时间</th>
                      {isAdmin && (
                        <th className="pb-3 font-semibold pr-3 text-right">管理操作</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leaderboard.map((entry, idx) => {
                      const isTop1 = idx === 0;
                      const isTop2 = idx === 1;
                      const isTop3 = idx === 2;

                      return (
                        <tr
                          key={entry.id || idx}
                          className={`hover:bg-slate-50 transition-colors ${
                            entry.isCurrentUser ? 'bg-emerald-50/60 font-semibold' : ''
                          }`}
                        >
                          <td className="py-3.5 pl-3">
                            {isTop1 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 text-amber-800 font-black text-sm">
                                🥇
                              </span>
                            ) : isTop2 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-200 text-slate-800 font-black text-sm">
                                🥈
                              </span>
                            ) : isTop3 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-50 text-amber-900 font-black text-sm">
                                🥉
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs">
                                {idx + 1}
                              </span>
                            )}
                          </td>

                          <td className="py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{entry.userName}</span>
                              {entry.isCurrentUser && (
                                <span className="px-1.5 py-0.2 bg-emerald-600 text-white rounded text-[10px] font-bold">
                                  我的
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400">{entry.roleTitle}</span>
                          </td>

                          <td className="py-3.5 text-slate-600">{entry.department}</td>

                          <td className="py-3.5 font-mono font-black text-slate-900 text-sm">
                            {entry.score} 分
                          </td>

                          <td className="py-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                                entry.percentage >= 90
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : entry.percentage >= 80
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {entry.percentage}%
                            </span>
                          </td>

                          {/* Extra Long Progress Bar Column */}
                          <td className="py-3.5 min-w-[220px] sm:min-w-[280px]">
                            <div className="space-y-1 pr-4">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-slate-700 font-mono">
                                  {entry.score} / {entry.maxScore || 310} 分
                                </span>
                                <span
                                  className={`font-black font-mono ${
                                    entry.percentage >= 90
                                      ? 'text-emerald-700'
                                      : entry.percentage >= 80
                                      ? 'text-blue-700'
                                      : 'text-amber-700'
                                  }`}
                                >
                                  {entry.percentage}%
                                </span>
                              </div>

                              <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200 shadow-inner">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 shadow-2xs ${
                                    entry.percentage >= 90
                                      ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600'
                                      : entry.percentage >= 80
                                      ? 'bg-gradient-to-r from-blue-500 to-teal-400'
                                      : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                                  }`}
                                  style={{ width: `${entry.percentage}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 text-slate-400 text-[11px]">
                            {entry.submittedAt}
                          </td>

                          {/* Admin Action: Delete Button */}
                          {isAdmin && (
                            <td className="py-3.5 pr-3 text-right">
                              <button
                                onClick={() => handleDeleteLeaderboardEntry(entry.id, entry.userName)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50 hover:border-rose-600 border border-rose-200 rounded-xl text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                                title={`管理员删除「${entry.userName}」的记录`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>删除</span>
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SUBMISSION HISTORY (我的历史记录) */}
      {activeTab === 'history' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <History className="w-5 h-5 text-emerald-600" />
                  <span>个人实训测评提交历史记录</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  记录您历次 31 款肥料 5 维分类实训的测评成绩与系列得分明细走势
                </p>
              </div>

              <div className="flex items-center gap-2">
                {submissionHistory.length > 0 && (
                  <button
                    onClick={handleClearAllHistory}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>清空历史记录</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setActiveTab('training');
                    setIsGradedView(false);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  继续实训答题
                </button>
              </div>
            </div>

            {submissionHistory.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <BookOpen className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm">暂无提交记录，完成全部 31 款肥料分类后点击“提交判分”即可在此生成记录！</p>
              </div>
            ) : (
              <div className="space-y-4">
                {submissionHistory.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-emerald-300 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-base">
                            测评得分：{item.totalScore} / {item.maxScore} 分
                          </span>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-xs font-bold">
                            正确率 {item.percentage}%
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          提交时间：{item.submittedAt}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleReopenSubmission(item)}
                          className="px-3.5 py-1.5 bg-blue-50 border border-blue-200 hover:border-blue-500 text-blue-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          重新打开作答
                        </button>

                        <button
                          onClick={() => {
                            setGradedResult(item);
                            setIsGradedView(true);
                            setActiveTab('training');
                          }}
                          className="px-3.5 py-1.5 bg-white border border-slate-200 hover:border-emerald-500 text-emerald-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          查看详细得分分析
                        </button>

                        <button
                          onClick={() => handleDeleteHistoryItem(item.id)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="删除此条历史记录"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Long Progress Bar in History Item */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                        <span>全库掌握度</span>
                        <span className="font-mono font-bold text-slate-700">{item.percentage}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden p-0.5">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Mini Series Score Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                      {Object.values(item.seriesScores || {}).map((s: { seriesId: string; name: string; score: number; maxScore: number; percentage: number; productCount: number }) => (
                        <div key={s.seriesId} className="bg-white p-2.5 rounded-xl border border-slate-200">
                          <div className="text-[11px] text-slate-500 font-medium truncate">{s.name}</div>
                          <div className="font-mono font-black text-slate-800 text-sm mt-0.5">
                            {s.score} / {s.maxScore} 分
                            <span className="text-[10px] text-slate-400 font-normal ml-1">
                              ({s.percentage}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: ADMIN CONFIGURATION (后台标准答案配置) */}
      {activeTab === 'admin_config' && isAdmin && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-purple-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-purple-100">
              <div>
                <h3 className="font-bold text-purple-950 text-base flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-purple-600" />
                  <span>管理员 5 维标准答案校准后台</span>
                </h3>
                <p className="text-xs text-purple-600/80 mt-0.5">
                  在此维护各产品的官方标准维度属性，保存后将即时作为全员判分判题依据。
                </p>
              </div>

              <button
                onClick={handleSaveAdminAnswers}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>保存「{currentProduct.name}」标准答案</span>
              </button>
            </div>

            {saveSuccessMsg && (
              <div className="p-3 bg-purple-50 border border-purple-300 text-purple-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-purple-600" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {/* Product Switcher */}
            <div className="flex flex-wrap gap-1.5 pt-2">
              {QUIZ_PRODUCTS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProductId(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    selectedProductId === p.id
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-purple-50'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>

            {/* Editable 5 Dimensions */}
            <div className="space-y-4 pt-4">
              {QUIZ_DIMENSIONS.map((dim) => {
                const currentSelections = adminDraftSelections[dim.id] || [];

                return (
                  <div
                    key={dim.id}
                    className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-800 text-xs">{dim.title}</span>
                      <span className="text-[11px] text-purple-600 font-semibold">
                        已设 {currentSelections.length} 项为正确答案
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {dim.options.map((opt) => {
                        const isSelected = currentSelections.includes(opt.id);

                        return (
                          <button
                            key={opt.id}
                            onClick={() => handleToggleOption(dim.id, opt.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-purple-100 text-purple-900 border-purple-500 font-bold shadow-2xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span>{opt.label}</span>
                            {isSelected && <span className="ml-1 text-purple-600 font-bold">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* "你真棒！" Celebration Confetti Modal */}
      {showCelebrationModal && gradedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl border border-amber-200 p-6 sm:p-8 max-w-lg w-full text-center space-y-5 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Background Glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />

            {/* Thumbs Up Icon with Ribbon */}
            <div className="relative inline-block">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 to-amber-500 text-white flex items-center justify-center mx-auto shadow-lg ring-8 ring-amber-100 animate-bounce">
                <ThumbsUp className="w-10 h-10" />
              </div>
              <span className="absolute -bottom-2 -right-2 text-2xl">🎉</span>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                你真棒！实训考核测评完成！
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                恭喜您完成全部 31 款肥料的五维属性分类实训！
              </p>
            </div>

            {/* Score Highlight Box */}
            <div className="bg-gradient-to-br from-amber-50 to-emerald-50 border border-amber-200/80 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-around">
                <div>
                  <span className="text-xs text-slate-500 font-medium block">总得分</span>
                  <span className="text-3xl font-black text-emerald-700">
                    {gradedResult.totalScore}
                    <span className="text-xs text-slate-400 font-normal"> / 310 分</span>
                  </span>
                </div>

                <div className="w-px h-10 bg-slate-200" />

                <div>
                  <span className="text-xs text-slate-500 font-medium block">考核掌握正确率</span>
                  <span className="text-3xl font-black text-amber-600">{gradedResult.percentage}%</span>
                </div>
              </div>

              {/* Long Progress Bar in Celebration Modal */}
              <div className="pt-2 border-t border-amber-200/60 space-y-1 text-left">
                <div className="flex justify-between text-[11px] font-bold text-slate-600">
                  <span>实训考核全库掌握度</span>
                  <span className="text-emerald-700 font-mono">{gradedResult.percentage}% 达成</span>
                </div>
                <div className="w-full h-3.5 bg-white rounded-full overflow-hidden p-0.5 border border-amber-300 shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: `${gradedResult.percentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Praise Text */}
            <p className="text-xs text-emerald-800 bg-emerald-100/60 p-2.5 rounded-xl font-bold">
              {gradedResult.percentage >= 90
                ? '🌟 特级专家水准！对全系产品定位与施用适期掌握极其精准！'
                : gradedResult.percentage >= 80
                ? '👏 卓越水肥工程师！核心功效与成分掌握扎实！'
                : '💪 恭喜完成！可结合系列合并进度条与错题解析进一步强化。'}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  setShowCelebrationModal(false);
                  setActiveTab('leaderboard');
                }}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-2xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trophy className="w-4 h-4" />
                <span>前往全员排行榜</span>
              </button>

              <button
                onClick={() => {
                  setShowCelebrationModal(false);
                  setIsGradedView(true);
                  setActiveTab('training');
                }}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <BarChart3 className="w-4 h-4" />
                <span>查看系列详细得分</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Non-blocking In-App Confirmation Modal */}
      {confirmModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  confirmModal.confirmStyle === 'danger'
                    ? 'bg-rose-100 text-rose-600'
                    : 'bg-emerald-100 text-emerald-600'
                }`}
              >
                {confirmModal.confirmStyle === 'danger' ? (
                  <Trash2 className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">{confirmModal.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">请确认您的操作指令</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 leading-relaxed">
              {confirmModal.message}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-xs ${
                  confirmModal.confirmStyle === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {confirmModal.confirmText || '确定'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
