import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';

type ConfettiAnimationProps = {
  visible: boolean;
  onComplete?: () => void;
};

interface ConfettiPiece {
  id: number;
  startX: number;
  startY: number;
  color: string;
  size: number;
  horizontalMovement: number;
  duration: number;
  delay: number;
  rotation: number;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const ConfettiAnimation: React.FC<ConfettiAnimationProps> = ({ visible, onComplete }) => {
  const containerOpacity = useRef(new Animated.Value(0)).current;
  const animationRefs = useRef<Animated.CompositeAnimation[]>([]);

  useEffect(() => {
    if (visible) {
      // Show immediately
      containerOpacity.setValue(1);
      
      // Hide after animation
      const timer = setTimeout(() => {
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          if (onComplete) {
            onComplete();
          }
        });
      }, 2500);
      
      return () => {
        clearTimeout(timer);
        // Stop all animations
        animationRefs.current.forEach(anim => anim.stop());
        animationRefs.current = [];
      };
    } else {
      containerOpacity.setValue(0);
      // Stop all animations
      animationRefs.current.forEach(anim => anim.stop());
      animationRefs.current = [];
    }
  }, [visible, onComplete, containerOpacity]);

  // Generate confetti pieces
  const confettiPieces: ConfettiPiece[] = React.useMemo(() => {
    if (!visible) return [];
    
    return Array.from({ length: 60 }, (_, i) => {
      const startX = Math.random() * SCREEN_WIDTH;
      const horizontalMovement = (Math.random() - 0.5) * SCREEN_WIDTH * 0.5;
      const duration = 2000 + Math.random() * 600;
      const delay = Math.random() * 100;

      return {
        id: i,
        startX,
        startY: -30 - Math.random() * 30,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 8 + Math.random() * 6,
        horizontalMovement,
        duration,
        delay,
        rotation: Math.random() * 720,
      };
    });
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: containerOpacity,
        },
      ]} 
      pointerEvents="none"
    >
      {confettiPieces.map((piece) => (
        <AnimatedConfettiPiece 
          key={piece.id} 
          piece={piece} 
          animationRefs={animationRefs}
        />
      ))}
    </Animated.View>
  );
};

// Animated Confetti Piece component
const AnimatedConfettiPiece: React.FC<{ 
  piece: ConfettiPiece;
  animationRefs: React.MutableRefObject<Animated.CompositeAnimation[]>;
}> = ({ piece, animationRefs }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(piece.startY)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animations: Animated.CompositeAnimation[] = [];

    // Horizontal movement
    const xAnim = Animated.timing(translateX, {
      toValue: piece.horizontalMovement,
      duration: piece.duration,
      delay: piece.delay,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    });
    animations.push(xAnim);

    // Vertical movement
    const yAnim = Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT + 50,
      duration: piece.duration,
      delay: piece.delay,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    animations.push(yAnim);

    // Rotation
    const rotateAnim = Animated.timing(rotate, {
      toValue: piece.rotation + 720,
      duration: piece.duration,
      delay: piece.delay,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    animations.push(rotateAnim);

    // Opacity
    const opacityAnim = Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 50,
        delay: piece.delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: piece.duration * 0.7,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: piece.duration * 0.3,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    animations.push(opacityAnim);

    // Scale
    const scaleAnim = Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.2,
        duration: 100,
        delay: piece.delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: piece.duration * 0.5,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.8,
        duration: piece.duration * 0.5,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    animations.push(scaleAnim);

    // Start all animations
    const compositeAnim = Animated.parallel(animations);
    animationRefs.current.push(compositeAnim);
    compositeAnim.start();

    return () => {
      compositeAnim.stop();
      const index = animationRefs.current.indexOf(compositeAnim);
      if (index > -1) {
        animationRefs.current.splice(index, 1);
      }
    };
  }, [piece, translateX, translateY, rotate, opacity, scale, animationRefs]);

  const rotateStr = rotate.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        {
          backgroundColor: piece.color,
          width: piece.size,
          height: piece.size,
          borderRadius: piece.size / 2,
          left: piece.startX,
          top: piece.startY,
          transform: [
            { translateX },
            { translateY },
            { rotate: rotateStr },
            { scale },
          ],
          opacity,
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  confettiPiece: {
    position: 'absolute',
  },
});
