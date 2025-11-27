import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Animated, PanResponder, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SectionHeader } from '../components/layout';
import DonutChart from '../components/DonutChart';
import FloatingActionButton from '../components/FloatingActionButton';
import { CalendarIcon } from '../components/icons';
import { StreakChip } from '../components/StreakChip';
import { LevelChip } from '../components/LevelChip';
import { SummaryCard } from '../components/SummaryCard';
import { TransactionsList } from '../components/TransactionsList';
import { AddTransactionModal } from '../components/AddTransaction';
import { AddMiniBudgetModal } from '../components/AddMiniBudgetModal';
import { EmptyState } from '../components/states';
import { useThemeStyles } from '../theme/ThemeProvider';
import { useSettings } from '../state/SettingsProvider';
import { useTransactions } from '../state/TransactionsProvider';
import { useMonthlyTotals, useRecentTransactions } from '../state/selectors';
import { RootStackParamList } from '../navigation/RootNavigator';
import { formatCurrency } from '../utils/format';
import { clearAllData } from '../utils/devReset';
import { Transaction } from '../types';
import { formatMonthShort, getMonthKey, getPreviousMonthKey, getNextMonthKey, isCurrentMonth as isCurrentMonthKey } from '../utils/month';
import { trackBudgetExceeded } from '../services/analytics';
import { useTranslation } from 'react-i18next';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;
type HomeRoute = RouteProp<RootStackParamList, 'Home'>;

const HomeScreen: React.FC = () => {
  const theme = useThemeStyles();
  const navigation = useNavigation<Nav>();
  const route = useRoute<HomeRoute>();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { transactions, currentMonth, setCurrentMonth, deleteTransaction, hasMonthData } = useTransactions();
  
  // Track last processed month from route params to prevent infinite loops
  const lastProcessedMonthRef = React.useRef<string | null>(null);
  
  // Handle month parameter from navigation
  // Only process once per route param change, not on every currentMonth change
  React.useEffect(() => {
    const routeMonth = route.params?.month;
    
    // Only process if:
    // 1. Route has a month parameter
    // 2. It's different from current month
    // 3. We haven't already processed this exact route param value
    if (routeMonth && routeMonth !== currentMonth && routeMonth !== lastProcessedMonthRef.current) {
      lastProcessedMonthRef.current = routeMonth;
      setCurrentMonth(routeMonth).catch((err) => {
        console.error('[HomeScreen] Error setting month from route params:', err);
      });
    }
  }, [route.params?.month]); // Only depend on route.params?.month, not currentMonth or setCurrentMonth
  const totals = useMonthlyTotals(transactions, settings.monthlyIncome);
  const { t } = useTranslation();
  
  // State for managing how many transactions to show
  const [displayLimit, setDisplayLimit] = React.useState(10);
  
  // Reset display limit when month changes
  React.useEffect(() => {
    setDisplayLimit(10);
  }, [currentMonth]);
  
  // Get all transactions sorted by date (newest first) - no limit here
  const sortedTransactions = React.useMemo(() => {
    return [...transactions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [transactions]);
  
  // Get transactions to display (first displayLimit items)
  const displayedTransactions = React.useMemo(() => {
    return sortedTransactions.slice(0, displayLimit);
  }, [sortedTransactions, displayLimit]);
  
  const hasMoreTransactions = sortedTransactions.length > displayLimit;
  
  const handleLoadMore = () => {
    setDisplayLimit(prev => prev + 10);
  };
  
  // Debug: Log transactions when they change
  React.useEffect(() => {
    console.log('[HomeScreen] Transactions updated:', {
      currentMonth,
      transactionsCount: transactions.length,
      transactionIds: transactions.map((tx: Transaction) => tx.id),
      displayedCount: displayedTransactions.length,
      displayedIds: displayedTransactions.map((tx: Transaction) => tx.id),
      hasMore: hasMoreTransactions,
    });
  }, [transactions, displayedTransactions, currentMonth, hasMoreTransactions]);
  
  // Reset pan position when month changes
  React.useEffect(() => {
    pan.setValue({ x: 0, y: 0 });
  }, [currentMonth]);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [miniBudgetModalVisible, setMiniBudgetModalVisible] = useState(false);
  
  // Animation key for DonutChart - changes on focus to trigger animation
  const [chartAnimationKey, setChartAnimationKey] = useState(0);
  
  // Trigger animation when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Increment key to trigger animation reset in DonutChart
      setChartAnimationKey(prev => prev + 1);
    }, [])
  );
  
  // Swipe navigation state
  const pan = useRef(new Animated.ValueXY()).current;
  const swipeThreshold = 100; // Minimum swipe distance to trigger navigation
  const isSwipingRef = useRef(false); // Prevent multiple simultaneous swipes

  // Debug: Log currency on mount and when settings change
  React.useEffect(() => {
    console.log('[HomeScreen] Current currency:', settings.currency);
    console.log('[HomeScreen] Current settings:', settings);
  }, [settings.currency, settings]);

  // Track budget exceeded event
  const prevRemainingRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    const currentRemaining = totals.remaining;
    const prevRemaining = prevRemainingRef.current;
    
    // Track when budget is exceeded (remaining becomes negative)
    // Only track when transitioning from non-negative to negative
    if (prevRemaining !== null && prevRemaining >= 0 && currentRemaining < 0) {
      trackBudgetExceeded({
        monthly_income: settings.monthlyIncome,
        total_expenses: totals.expenses,
        total_saved: totals.saved,
        remaining: currentRemaining,
        month: currentMonth,
        exceeded_by: Math.abs(currentRemaining),
      });
    }
    
    prevRemainingRef.current = currentRemaining;
  }, [totals.remaining, totals.expenses, totals.saved, settings.monthlyIncome, currentMonth]);

  const handleChartPress = () => {
    navigation.navigate('Details');
  };

  const handleFABPress = () => {
    setTransactionToEdit(null);
    setModalVisible(true);
  };

  const handlePlanSelect = () => {
    setMiniBudgetModalVisible(true);
  };

  const handleGoalSelect = () => {
    navigation.navigate('Goals');
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setTransactionToEdit(null);
  };

  const handleTransactionPress = (transaction: Transaction) => {
    setTransactionToEdit(transaction);
    setModalVisible(true);
  };

  const handleTransactionDelete = async (transaction: Transaction) => {
    try {
      await deleteTransaction(transaction.id);
    } catch (error) {
      Alert.alert(t('common.error'), t('home.deleteError'));
      console.error('[HomeScreen] Delete error:', error);
    }
  };

  // Swipe navigation handlers
  const handleSwipeRight = React.useCallback(async () => {
    // Prevent multiple simultaneous swipes
    if (isSwipingRef.current) {
      console.log('[HomeScreen] Swipe already in progress, ignoring');
      return;
    }
    
    isSwipingRef.current = true;
    
    try {
      // Swipe right = previous month
      const prevMonth = getPreviousMonthKey(currentMonth);
      
      console.log('[HomeScreen] Swiping right to previous month:', {
        from: currentMonth,
        to: prevMonth,
      });
      
      // Stop any ongoing animation and reset position immediately
      pan.stopAnimation();
      pan.setValue({ x: 0, y: 0 });
      
      // Allow navigation to any previous month (no limits - can swipe unlimited months)
      await setCurrentMonth(prevMonth);
    } catch (error) {
      console.error('[HomeScreen] Error during swipe right:', error);
    } finally {
      // Reset swipe lock after a short delay to allow next swipe
      setTimeout(() => {
        isSwipingRef.current = false;
      }, 300);
    }
  }, [currentMonth, setCurrentMonth]);

  const handleSwipeLeft = React.useCallback(async () => {
    // Prevent multiple simultaneous swipes
    if (isSwipingRef.current) {
      console.log('[HomeScreen] Swipe already in progress, ignoring');
      return;
    }
    
    isSwipingRef.current = true;
    
    try {
      // Swipe left = next month
      const nextMonth = getNextMonthKey(currentMonth);
      
      console.log('[HomeScreen] Swiping left to next month:', {
        from: currentMonth,
        to: nextMonth,
      });
      
      // Stop any ongoing animation and reset position immediately
      pan.stopAnimation();
      pan.setValue({ x: 0, y: 0 });
      
      // Always allow navigation to next month (even if empty, no limits - can swipe unlimited months)
      await setCurrentMonth(nextMonth);
    } catch (error) {
      console.error('[HomeScreen] Error during swipe left:', error);
    } finally {
      // Reset swipe lock after a short delay to allow next swipe
      setTimeout(() => {
        isSwipingRef.current = false;
      }, 300);
    }
  }, [currentMonth, setCurrentMonth]);

  // PanResponder for swipe gestures
  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (evt, gestureState) => {
          // Only respond to horizontal swipes
          return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
        },
        onPanResponderGrant: () => {
          // Stop any ongoing animation when gesture starts
          pan.stopAnimation();
          pan.setValue({ x: 0, y: 0 });
        },
        onPanResponderMove: (evt, gestureState) => {
          // Allow horizontal movement in both directions
          const dx = gestureState.dx;
          pan.setValue({ x: dx, y: 0 });
        },
        onPanResponderRelease: (evt, gestureState) => {
          if (Math.abs(gestureState.dx) > swipeThreshold) {
            // Stop any ongoing animation before handling swipe
            pan.stopAnimation();
            
            if (gestureState.dx > 0) {
              // Swipe right = previous month
              handleSwipeRight();
            } else {
              // Swipe left = next month
              handleSwipeLeft();
            }
          } else {
            // Reset position if swipe wasn't far enough
            pan.stopAnimation();
            Animated.spring(pan, {
              toValue: { x: 0, y: 0 },
              useNativeDriver: false,
            }).start();
          }
        },
      }),
    [handleSwipeLeft, handleSwipeRight, pan, swipeThreshold],
  );

  const handleResetOnboarding = async () => {
    Alert.alert(
      t('home.resetOnboardingTitle'),
      t('home.resetOnboardingMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.resetData'),
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllData();
              Alert.alert(
                t('common.success'),
                t('home.resetOnboardingSuccess'),
              );
            } catch (error) {
              Alert.alert(t('common.error'), t('home.resetOnboardingError'));
            }
          },
        },
      ],
    );
  };

  const remainingColor = totals.remaining < 0 ? theme.colors.danger : theme.colors.textPrimary;

  return (
    <Animated.View
      style={[
        styles.screenContainer,
        {
          backgroundColor: theme.colors.background,
          // Removed paddingTop: insets.top - header already handles safe area
          transform: [{ translateX: pan.x }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 100 }, // Space for FAB
        ]}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >

        {/* Donut Chart Section */}
        <View style={styles.chartSection}>
          {/* Calendar Icon - positioned top right */}
          <TouchableOpacity
            testID="calendar-icon-button"
            onPress={() => navigation.navigate('Calendar', { initialMonth: currentMonth })}
            style={styles.calendarIconButton}
            activeOpacity={0.7}
            accessibilityLabel={t('calendar.openCalendar', { defaultValue: 'Open calendar to select month' })}
            accessibilityRole="button"
          >
            <CalendarIcon size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          
          <DonutChart
            animationTrigger={chartAnimationKey}
            spent={totals.expenses}
            saved={totals.saved}
            remaining={totals.chartRemaining}
            size={200}
            strokeWidth={20}
            onPress={handleChartPress}
            showLabels={false}
            centerLabelValue={totals.remaining}
            centerLabelCurrency={settings.currency}
            centerLabelColor={remainingColor}
            centerSubLabel={`${t('home.of')} ${formatCurrency(totals.income, settings.currency)} ${t('home.total')}\n${formatMonthShort(currentMonth)}`}
            centerSubLabelColor={theme.colors.textSecondary}
          />
          {totals.remaining < 0 && (
            <Text
              style={[
                styles.overBudgetWarning,
                {
                  color: theme.colors.danger,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                },
              ]}
            >
              {t('home.overBudget')} {formatCurrency(Math.abs(totals.remaining), settings.currency)}
            </Text>
          )}
        </View>

        {/* Gamification Ribbon */}
        <View style={styles.gamificationRibbon}>
          <StreakChip
            onPress={() => navigation.navigate('Achievements')}
          />
          <LevelChip
            onPress={() => navigation.navigate('Achievements')}
          />
        </View>

        {/* Summary Stats Section */}
        <View style={styles.summarySection}>
          <SectionHeader
            title={t('home.summary')}
            variant="overline"
            style={styles.sectionHeader}
          />
          <View style={styles.summaryGrid}>
            <SummaryCard
              label={t('home.remaining')}
              value={formatCurrency(totals.remaining, settings.currency)}
              variant={totals.remaining < 0 ? 'negative' : totals.remaining > 0 ? 'positive' : 'neutral'}
              style={styles.summaryCard}
            />
            <SummaryCard
              label={t('home.spent')}
              value={formatCurrency(totals.expenses, settings.currency)}
              variant="negative"
              style={styles.summaryCard}
            />
            <SummaryCard
              label={t('home.saved')}
              value={formatCurrency(totals.saved, settings.currency)}
              variant="positive"
              style={styles.summaryCard}
            />
          </View>
        </View>

        {/* Recent Transactions Section */}
        <View style={styles.recentTransactionsSection}>
          <SectionHeader
            title={t('home.recentTransactions')}
            variant="overline"
            style={styles.sectionHeader}
          />
          {transactions.length === 0 ? (
            <EmptyState
              icon="📝"
              title={t('home.noTransactions')}
              message={t('home.noTransactionsMessage')}
              actionLabel={t('home.addTransaction')}
              onAction={handleFABPress}
              accessibilityLabel={t('home.noTransactionsAccessibility')}
            />
          ) : (
            <TransactionsList
              transactions={displayedTransactions}
              currency={settings.currency}
              hasMore={hasMoreTransactions}
              onLoadMore={handleLoadMore}
              onTransactionPress={handleTransactionPress}
              onTransactionDelete={handleTransactionDelete}
            />
          )}
        </View>

        {/* Development Reset Button - Remove in production */}
        {__DEV__ && (
          <View style={styles.devSection}>
            <FloatingActionButton
              onPress={handleResetOnboarding}
              size={48}
              style={{
                ...styles.devButton,
                backgroundColor: theme.colors.danger,
              }}
            />
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button - Fixed in bottom right */}
      <View
        style={[
          styles.fabContainer,
          {
            bottom: Math.max(24, insets.bottom + 8), // Account for safe area
            right: Math.max(24, insets.right + 8),
          },
        ]}
        accessible={false}
        accessibilityElementsHidden={true}
      >
        <FloatingActionButton 
          onPress={handleFABPress}
          accessibilityLabel={t('home.addTransactionAccessibility')}
        />
      </View>

      {/* Add/Edit Transaction Modal */}
      <AddTransactionModal
        visible={modalVisible}
        transactionToEdit={transactionToEdit}
        currentMonth={currentMonth}
        onClose={handleCloseModal}
        onPlanSelect={handlePlanSelect}
        onGoalSelect={handleGoalSelect}
      />

      {/* Add/Edit Mini Budget Modal */}
      <AddMiniBudgetModal
        visible={miniBudgetModalVisible}
        currentMonth={currentMonth}
        onClose={() => setMiniBudgetModalVisible(false)}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12.35, // Reduced by 20% from 15.44 (15.44 * 0.8 = 12.352)
    paddingBottom: 24,
    gap: 24,
  },
  chartSection: {
    alignItems: 'center',
    marginVertical: 8,
    position: 'relative',
  },
  calendarIconButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 8,
    zIndex: 10,
  },
  overBudgetWarning: {
    marginTop: 12,
    textAlign: 'center',
  },
  gamificationRibbon: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  summarySection: {
    marginTop: 8,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: '30%',
  },
  recentTransactionsSection: {
    marginTop: 8,
  },
  devSection: {
    alignItems: 'center',
    marginTop: 16,
  },
  devButton: {
    marginTop: 8,
  },
  fabContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000, // Ensure FAB is above all content
    elevation: 8, // Android shadow/elevation
  },
});

export default HomeScreen;
