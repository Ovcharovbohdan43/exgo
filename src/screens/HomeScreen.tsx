import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Animated, PanResponder, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SectionHeader } from '../components/layout';
import DonutChart from '../components/DonutChart';
import FloatingActionButton from '../components/FloatingActionButton';
import { SummaryCard } from '../components/SummaryCard';
import { TransactionsList } from '../components/TransactionsList';
import { AddTransactionModal } from '../components/AddTransaction';
import { useThemeStyles } from '../theme/ThemeProvider';
import { useSettings } from '../state/SettingsProvider';
import { useTransactions } from '../state/TransactionsProvider';
import { useMonthlyTotals, useRecentTransactions } from '../state/selectors';
import { RootStackParamList } from '../navigation/RootNavigator';
import { formatCurrency } from '../utils/format';
import { clearAllData } from '../utils/devReset';
import { Transaction } from '../types';
import { formatMonthShort, getMonthKey, getPreviousMonthKey, getNextMonthKey, isCurrentMonth as isCurrentMonthKey } from '../utils/month';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen: React.FC = () => {
  const theme = useThemeStyles();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { transactions, currentMonth, setCurrentMonth, deleteTransaction, hasMonthData } = useTransactions();
  const totals = useMonthlyTotals(transactions, settings.monthlyIncome);
  const recentTransactions = useRecentTransactions(transactions, 5);
  
  // Reset pan position when month changes
  React.useEffect(() => {
    pan.setValue({ x: 0, y: 0 });
  }, [currentMonth]);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  
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

  const handleChartPress = () => {
    navigation.navigate('Details');
  };

  const handleFABPress = () => {
    setTransactionToEdit(null);
    setModalVisible(true);
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
      Alert.alert('Error', 'Failed to delete transaction. Please try again.');
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
      'Reset Onboarding',
      'This will clear all data and show onboarding screen again. Restart the app after reset.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllData();
              Alert.alert(
                'Success',
                'Data cleared! Please restart the app (close and reopen) to see onboarding.',
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data. Check console for details.');
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
            centerSubLabel={`Of ${formatCurrency(totals.income, settings.currency)} total\n${formatMonthShort(currentMonth)}`}
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
              Over budget by {formatCurrency(Math.abs(totals.remaining), settings.currency)}
            </Text>
          )}
        </View>

        {/* Summary Stats Section */}
        <View style={styles.summarySection}>
          <SectionHeader
            title="Summary"
            variant="overline"
            style={styles.sectionHeader}
          />
          <View style={styles.summaryGrid}>
            <SummaryCard
              label="Remaining"
              value={formatCurrency(totals.remaining, settings.currency)}
              variant={totals.remaining < 0 ? 'negative' : totals.remaining > 0 ? 'positive' : 'neutral'}
              style={styles.summaryCard}
            />
            <SummaryCard
              label="Spent"
              value={formatCurrency(totals.expenses, settings.currency)}
              variant="negative"
              style={styles.summaryCard}
            />
            <SummaryCard
              label="Saved"
              value={formatCurrency(totals.saved, settings.currency)}
              variant="positive"
              style={styles.summaryCard}
            />
          </View>
        </View>

        {/* Recent Transactions Section */}
        <View style={styles.recentTransactionsSection}>
          <SectionHeader
            title="Recent Transactions"
            variant="overline"
            style={styles.sectionHeader}
          />
          <TransactionsList
            transactions={recentTransactions}
            currency={settings.currency}
            maxItems={5}
            onTransactionPress={handleTransactionPress}
            onTransactionDelete={handleTransactionDelete}
          />
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
      >
        <FloatingActionButton onPress={handleFABPress} />
      </View>

      {/* Add/Edit Transaction Modal */}
      <AddTransactionModal
        visible={modalVisible}
        transactionToEdit={transactionToEdit}
        currentMonth={currentMonth}
        onClose={handleCloseModal}
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
  },
  overBudgetWarning: {
    marginTop: 12,
    textAlign: 'center',
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
