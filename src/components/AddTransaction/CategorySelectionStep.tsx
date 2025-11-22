import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ViewStyle } from 'react-native';
import { Card } from '../layout';
import { useThemeStyles } from '../../theme/ThemeProvider';
import { EXPENSE_CATEGORIES } from '../../constants/categories';
import { TransactionType } from '../../types';
import { getCategoryEmoji } from '../../utils/categoryEmojis';

type CategorySelectionStepProps = {
  type: TransactionType;
  selectedCategory: string | null;
  onSelect: (category: string) => void;
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
  style,
}) => {
  const theme = useThemeStyles();

  // For income, category is fixed
  if (type === 'income') {
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
          Category
        </Text>
        <Card
          variant="outlined"
          padding="lg"
          style={{
            ...styles.fixedCategory,
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.positive,
          }}
        >
          <Text style={styles.emoji}>{getCategoryEmoji('Income')}</Text>
          <Text
            style={[
              styles.fixedCategoryText,
              {
                color: theme.colors.positive,
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.semibold,
              },
            ]}
          >
            Income
          </Text>
        </Card>
      </View>
    );
  }

  // For saved, default category is "Savings"
  const categories = type === 'saved' 
    ? ['Savings']
    : EXPENSE_CATEGORIES;

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
        {type === 'saved' ? 'Category' : 'Select Category'}
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
                <Text style={styles.categoryEmoji}>{getCategoryEmoji(category)}</Text>
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
                  {category}
                </Text>
              </Card>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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
});

