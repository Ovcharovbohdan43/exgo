import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ViewStyle } from 'react-native';
import { Card } from '../layout';
import { useThemeStyles } from '../../theme/ThemeProvider';
import { useSettings } from '../../state/SettingsProvider';
import { EXPENSE_CATEGORIES } from '../../constants/categories';
import { TransactionType } from '../../types';
import { getCategoryEmoji } from '../../utils/categoryEmojis';
import { AddCategoryModal } from './AddCategoryModal';
import { CustomCategory } from '../../types';
import { useTranslation } from 'react-i18next';
import { getLocalizedCategory } from '../../utils/categoryLocalization';
import { useCreditProducts } from '../../state/CreditProductsProvider';
import { AddCreditProductModal } from './AddCreditProductModal';

type CategorySelectionStepProps = {
  type: TransactionType;
  selectedCategory: string | null;
  onSelect: (category: string) => void;
  selectedCreditProductId?: string | null;
  onSelectCreditProduct?: (productId: string) => void;
  style?: ViewStyle;
};

/**
 * CategorySelectionStep - Step for selecting transaction category
 * Shows different categories based on transaction type
 */
export const CategorySelectionStep: React.FC<CategorySelectionStepProps> = ({
  type,
  selectedCategory,
  onSelect,
  selectedCreditProductId,
  onSelectCreditProduct,
  style,
}) => {
  const theme = useThemeStyles();
  const { settings, updateSettings } = useSettings();
  const { t } = useTranslation();
  const { getActiveCreditProducts, hydrated: creditProductsHydrated } = useCreditProducts();
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showAddCreditProductModal, setShowAddCreditProductModal] = useState(false);

  const customCategories = settings.customCategories || [];

  // Filter custom categories by type
  const customCategoriesForType = customCategories.filter((cat) => cat.type === type);

  // For credit type, show credit products instead of categories
  if (type === 'credit') {
    const creditProducts = creditProductsHydrated ? getActiveCreditProducts() : [];

    return (
      <View style={style}>
        <Text
          style={[
            styles.label,
            {
              color: theme.colors.textPrimary,
              fontSize: theme.typography.fontSize.md,
              fontWeight: theme.typography.fontWeight.medium,
              marginBottom: theme.spacing.md,
            },
          ]}
        >
          {t('addTransaction.selectCreditProduct', { defaultValue: 'Select Credit Product' })}
        </Text>
        
        {/* Always show "Create Credit Product" button first, even if products exist */}
        <TouchableOpacity
          onPress={() => setShowAddCreditProductModal(true)}
          activeOpacity={0.7}
          style={{ marginBottom: 12 }}
        >
          <Card
            variant="outlined"
            padding="md"
            style={{
              ...styles.categoryCard,
              ...styles.addCategoryCard,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderWidth: 1,
              borderStyle: 'dashed',
            }}
          >
            <Text style={styles.addCategoryIcon}>+</Text>
            <Text
              style={[
                styles.categoryText,
                {
                  color: theme.colors.textSecondary,
                  fontSize: theme.typography.fontSize.md,
                  fontWeight: theme.typography.fontWeight.medium,
                },
              ]}
            >
              Create New Credit Product
            </Text>
          </Card>
        </TouchableOpacity>
        
        {/* Show existing credit products if any */}
        {creditProducts.length > 0 && (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.categoriesContainer}
            showsVerticalScrollIndicator={false}
          >
            {creditProducts.map((product) => {
              const isSelected = selectedCreditProductId === product.id;
              return (
                <TouchableOpacity
                  key={product.id}
                  onPress={() => {
                    onSelect('Credits');
                    onSelectCreditProduct?.(product.id);
                    // After selecting product, the parent component should handle navigation
                  }}
                  activeOpacity={0.7}
                >
                  <Card
                    variant={isSelected ? 'elevated' : 'outlined'}
                    padding="md"
                    style={{
                      ...styles.categoryCard,
                      backgroundColor: isSelected 
                        ? (theme.colors.warning || '#FFA500') + '15' 
                        : theme.colors.surface,
                      borderColor: isSelected 
                        ? (theme.colors.warning || '#FFA500') 
                        : theme.colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    }}
                  >
                    <Text style={styles.categoryEmoji}>💳</Text>
                    <Text
                      style={[
                        styles.categoryText,
                        {
                          color: isSelected 
                            ? (theme.colors.warning || '#FFA500') 
                            : theme.colors.textPrimary,
                          fontSize: theme.typography.fontSize.md,
                          fontWeight: isSelected 
                            ? theme.typography.fontWeight.semibold 
                            : theme.typography.fontWeight.medium,
                        },
                      ]}
                    >
                      {product.name}
                    </Text>
                    <Text
                      style={[
                        styles.subText,
                        {
                          color: theme.colors.textSecondary,
                          fontSize: theme.typography.fontSize.sm,
                        },
                      ]}
                    >
                      {settings.currency} {product.remainingBalance.toFixed(2)} remaining
                    </Text>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
        
        <AddCreditProductModal
          visible={showAddCreditProductModal}
          onClose={() => setShowAddCreditProductModal(false)}
          onProductCreated={(productId) => {
            setShowAddCreditProductModal(false);
            onSelect('Credits');
            onSelectCreditProduct?.(productId);
          }}
        />
      </View>
    );
  }

  // Handle adding new custom category
  const handleAddCategory = async (category: CustomCategory) => {
    const updatedCategories = [...customCategories, category];
    await updateSettings({ customCategories: updatedCategories });
    // Automatically select the newly created category
    onSelect(category.name);
  };

  // For income, show default "Income" category plus custom income categories
  if (type === 'income') {
    const defaultIncomeCategories = ['Income'];
    const customIncomeCategoryNames = customCategoriesForType.map((cat) => cat.name);
    const incomeCategories = [...defaultIncomeCategories, ...customIncomeCategoryNames];

    return (
      <View style={style}>
        <Text
          style={[
            styles.label,
            {
              color: theme.colors.textPrimary,
              fontSize: theme.typography.fontSize.md,
              fontWeight: theme.typography.fontWeight.medium,
              marginBottom: theme.spacing.md,
            },
          ]}
        >
          {t('addTransaction.selectCategory')}
        </Text>
        
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.categoriesContainer}
          showsVerticalScrollIndicator={false}
        >
          {incomeCategories.map((category) => {
            const isSelected = selectedCategory === category;
            return (
              <TouchableOpacity
                key={category}
                onPress={() => onSelect(category)}
                activeOpacity={0.7}
              >
                <Card
                  variant={isSelected ? 'elevated' : 'outlined'}
                  padding="md"
                  style={{
                    ...styles.categoryCard,
                    backgroundColor: isSelected 
                      ? theme.colors.positive + '15' 
                      : theme.colors.surface,
                    borderColor: isSelected 
                      ? theme.colors.positive 
                      : theme.colors.border,
                    borderWidth: isSelected ? 2 : 1,
                  }}
                >
                  <Text style={styles.categoryEmoji}>{getCategoryEmoji(category, customCategories)}</Text>
                  <Text
                    style={[
                      styles.categoryText,
                      {
                        color: isSelected 
                          ? theme.colors.positive 
                          : theme.colors.textPrimary,
                        fontSize: theme.typography.fontSize.md,
                        fontWeight: isSelected 
                          ? theme.typography.fontWeight.semibold 
                          : theme.typography.fontWeight.medium,
                      },
                    ]}
                  >
                    {getLocalizedCategory(category)}
                  </Text>
                </Card>
              </TouchableOpacity>
            );
          })}
          
          {/* Add Custom Category Button for income */}
          <TouchableOpacity
            onPress={() => setShowAddCategoryModal(true)}
            activeOpacity={0.7}
          >
            <Card
              variant="outlined"
              padding="md"
              style={{
                ...styles.categoryCard,
                ...styles.addCategoryCard,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderWidth: 1,
                borderStyle: 'dashed',
              }}
            >
              <Text style={styles.addCategoryIcon}>+</Text>
              <Text
                style={[
                  styles.categoryText,
                  {
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.fontSize.md,
                    fontWeight: theme.typography.fontWeight.medium,
                  },
                ]}
              >
                {t('addTransaction.addCustomCategory')}
              </Text>
            </Card>
          </TouchableOpacity>
        </ScrollView>

        <AddCategoryModal
          visible={showAddCategoryModal}
          existingCategories={incomeCategories}
          categoryType="income"
          onClose={() => setShowAddCategoryModal(false)}
          onSave={handleAddCategory}
        />
      </View>
    );
  }

  // For saved, default category is "Savings"
  const defaultCategories = type === 'saved' 
    ? ['Savings']
    : EXPENSE_CATEGORIES;

  // Combine default and custom categories for expense type
  const customCategoryNames = customCategoriesForType.map((cat) => cat.name);
  const categories = [...defaultCategories, ...customCategoryNames];

  const getAllCategoryNames = () => {
    return [...defaultCategories, ...customCategoryNames];
  };

  return (
    <View style={style}>
      <Text
        style={[
          styles.label,
          {
            color: theme.colors.textPrimary,
            fontSize: theme.typography.fontSize.md,
            fontWeight: theme.typography.fontWeight.medium,
            marginBottom: theme.spacing.md,
          },
        ]}
      >
        {type === 'saved' ? t('addTransaction.category') : t('addTransaction.selectCategory')}
      </Text>
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.categoriesContainer}
        showsVerticalScrollIndicator={false}
      >
        {categories.map((category) => {
          const isSelected = selectedCategory === category;
          return (
            <TouchableOpacity
              key={category}
              onPress={() => onSelect(category)}
              activeOpacity={0.7}
            >
              <Card
                variant={isSelected ? 'elevated' : 'outlined'}
                padding="md"
                style={{
                  ...styles.categoryCard,
                  backgroundColor: isSelected 
                    ? theme.colors.accent + '15' 
                    : theme.colors.surface,
                  borderColor: isSelected 
                    ? theme.colors.accent 
                    : theme.colors.border,
                  borderWidth: isSelected ? 2 : 1,
                }}
              >
                <Text style={styles.categoryEmoji}>{getCategoryEmoji(category, customCategories)}</Text>
                <Text
                  style={[
                    styles.categoryText,
                    {
                      color: isSelected 
                        ? theme.colors.accent 
                        : theme.colors.textPrimary,
                      fontSize: theme.typography.fontSize.md,
                      fontWeight: isSelected 
                        ? theme.typography.fontWeight.semibold 
                        : theme.typography.fontWeight.medium,
                    },
                  ]}
                >
                  {getLocalizedCategory(category)}
                </Text>
              </Card>
            </TouchableOpacity>
          );
        })}
        
        {/* Add Custom Category Button - only for expense type */}
        {type === 'expense' && (
          <TouchableOpacity
            onPress={() => setShowAddCategoryModal(true)}
            activeOpacity={0.7}
          >
            <Card
              variant="outlined"
              padding="md"
              style={{
                ...styles.categoryCard,
                ...styles.addCategoryCard,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderWidth: 1,
                borderStyle: 'dashed',
              }}
            >
              <Text style={styles.addCategoryIcon}>+</Text>
              <Text
                style={[
                  styles.categoryText,
                  {
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.fontSize.md,
                    fontWeight: theme.typography.fontWeight.medium,
                  },
                ]}
              >
                {t('addTransaction.addCustomCategory')}
              </Text>
            </Card>
          </TouchableOpacity>
        )}
      </ScrollView>

      <AddCategoryModal
        visible={showAddCategoryModal}
        existingCategories={getAllCategoryNames()}
        categoryType="expense"
        onClose={() => setShowAddCategoryModal(false)}
        onSave={handleAddCategory}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    marginBottom: 12,
  },
  fixedCategory: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  emoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  fixedCategoryText: {
    textAlign: 'center',
  },
  scrollView: {
    maxHeight: 300,
  },
  categoriesContainer: {
    gap: 12,
    paddingBottom: 8,
  },
  categoryCard: {
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryText: {
    textAlign: 'center',
  },
  addCategoryCard: {
    borderStyle: 'dashed',
  },
  addCategoryIcon: {
    fontSize: 32,
    color: '#9ca3af',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    textAlign: 'center',
  },
  subText: {
    textAlign: 'center',
    marginTop: 4,
  },
  createButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    textAlign: 'center',
  },
});

