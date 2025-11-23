import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useThemeStyles } from '../theme/ThemeProvider';
import { useNotifications } from '../state/NotificationProvider';
import { Notification } from '../types';
import { formatDate } from '../utils/date';

const NotificationsScreen: React.FC = () => {
  const theme = useThemeStyles();
  const { notifications, markAsRead, deleteNotification } = useNotifications();
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  const unreadNotifications = notifications.filter((n) => !n.read);
  const readNotifications = notifications.filter((n) => n.read);

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
  };

  const handleDelete = async (id: string) => {
    // Close swipeable before deleting
    const swipeable = swipeableRefs.current.get(id);
    if (swipeable) {
      swipeable.close();
    }
    swipeableRefs.current.delete(id);
    await deleteNotification(id);
  };

  const renderRightActions = (item: Notification) => {
    return (
      <View
        style={[
          styles.deleteAction,
          {
            backgroundColor: theme.colors.danger,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <Text
          style={[
            styles.deleteActionText,
            {
              color: theme.colors.background,
              fontSize: theme.typography.fontSize.md,
              fontWeight: theme.typography.fontWeight.semibold,
            },
          ]}
        >
          Delete
        </Text>
      </View>
    );
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    return (
      <Swipeable
        ref={(ref) => {
          if (ref) {
            swipeableRefs.current.set(item.id, ref);
          } else {
            swipeableRefs.current.delete(item.id);
          }
        }}
        renderRightActions={() => renderRightActions(item)}
        onSwipeableRightOpen={() => {
          // Automatically delete when fully swiped
          handleDelete(item.id);
        }}
        onSwipeableOpen={() => {
          // Close other swipeables when one opens
          swipeableRefs.current.forEach((swipeable, id) => {
            if (id !== item.id && swipeable) {
              swipeable.close();
            }
          });
        }}
        rightThreshold={80}
        overshootRight={false}
      >
        <TouchableOpacity
          onPress={() => handleNotificationPress(item)}
          style={[
            styles.notificationItem,
            {
              backgroundColor: item.read ? theme.colors.surface : theme.colors.background,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.notificationContent}>
            <Text
              style={[
                styles.notificationTitle,
                {
                  color: theme.colors.textPrimary,
                  fontSize: theme.typography.fontSize.md,
                  fontWeight: item.read
                    ? theme.typography.fontWeight.medium
                    : theme.typography.fontWeight.semibold,
                },
              ]}
            >
              {item.title}
            </Text>
            <Text
              style={[
                styles.notificationMessage,
                {
                  color: theme.colors.textSecondary,
                  fontSize: theme.typography.fontSize.sm,
                  marginTop: theme.spacing.xs,
                },
              ]}
            >
              {item.message}
            </Text>
            <Text
              style={[
                styles.notificationDate,
                {
                  color: theme.colors.textSecondary,
                  fontSize: theme.typography.fontSize.xs,
                  marginTop: theme.spacing.xs,
                },
              ]}
            >
              {formatDate(item.createdAt)}
            </Text>
          </View>
          {!item.read && (
            <View
              style={[
                styles.unreadIndicator,
                { backgroundColor: theme.colors.accent },
              ]}
            />
          )}
        </TouchableOpacity>
      </Swipeable>
    );
  };

  const allNotifications = [...unreadNotifications, ...readNotifications];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      {allNotifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text
            style={[
              styles.emptyText,
              {
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.md,
              },
            ]}
          >
            No notifications yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={allNotifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    position: 'relative',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    marginBottom: 4,
  },
  notificationMessage: {
    lineHeight: 20,
  },
  notificationDate: {
    marginTop: 8,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: 16,
    right: 16,
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 12,
    borderRadius: 12,
  },
  deleteActionText: {
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
});

export default NotificationsScreen;

