import React, { createContext, useContext, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import {
  PanGestureHandler,
  State,
} from 'react-native-gesture-handler';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SIDEBAR_WIDTH = 350;

const SidebarContext = createContext(null);
export const useSidebar = () => useContext(SidebarContext);

export function SidebarProvider({ children }) {
  const [visible, setVisible] = useState(false);
  const [sidebarPosition, setSidebarPosition] = useState('right'); // 'left' or 'right'
  const [sidebarTitle, setSidebarTitle] = useState('');
  const [sidebarContent, setSidebarContent] = useState(null);

  const translateX = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const dragX = useRef(new Animated.Value(0)).current;

  const openSidebar = ({ title = '', content = null, position = 'right' }) => {
    setSidebarTitle(title);
    setSidebarContent(content);
    setSidebarPosition(position);
    dragX.setValue(0);
    setVisible(true);

    Animated.timing(translateX, {
      toValue: position === 'right' ? SCREEN_WIDTH - SIDEBAR_WIDTH : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const closeSidebar = () => {
    Animated.timing(translateX, {
      toValue: sidebarPosition === 'right' ? SCREEN_WIDTH : -SIDEBAR_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      dragX.setValue(0);
      // keep title/content so gesture can reopen same content
    });
  };

  // Gesture to drag sidebar and close it
  const gestureHandler = (event) => {
    const x = event.nativeEvent.translationX;
    if (sidebarPosition === 'right') {
      dragX.setValue(x > 0 ? x : 0); // drag right only
    } else {
      dragX.setValue(x < 0 ? x : 0); // drag left only
    }
  };

  const onHandlerStateChange = (event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationX, velocityX } = event.nativeEvent;

      const shouldClose =
        (sidebarPosition === 'right' && (translationX > 50 || velocityX > 500)) ||
        (sidebarPosition === 'left' && (translationX < -50 || velocityX < -500));

      if (shouldClose) {
        closeSidebar();
      } else {
        Animated.timing(dragX, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  return (
    <SidebarContext.Provider value={{ openSidebar, closeSidebar }}>

      {children}

      {/* Backdrop */}
      {visible && (
        <TouchableWithoutFeedback onPress={closeSidebar}>
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: translateX.interpolate({
                  inputRange: [
                    sidebarPosition === 'right'
                      ? SCREEN_WIDTH - SIDEBAR_WIDTH
                      : 0,
                    SCREEN_WIDTH,
                  ],
                  outputRange: [0.5, 0],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          />
        </TouchableWithoutFeedback>
      )}

      {/* Sidebar */}
      <PanGestureHandler
        onGestureEvent={gestureHandler}
        activeOffsetX={[-10, 10]} 
        onHandlerStateChange={onHandlerStateChange}
        enabled={visible}
      >
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.sidebar,
            sidebarPosition === 'right'
            ? { right: 0, left: undefined }
            : { left: 0, right: undefined },
            {
              right: sidebarPosition === 'right' ? 0 : undefined,
              left: sidebarPosition === 'left' ? 0 : undefined,
              transform: [
                {
                  translateX:
                    sidebarPosition === 'right'
                      ? Animated.add(translateX, dragX)
                      : Animated.add(
                          Animated.multiply(translateX, -1),
                          Animated.multiply(dragX, -1)
                        ),
                },
              ],
              opacity: visible ? 1 : 0,
              pointerEvents: visible ? 'auto' : 'none',
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{sidebarTitle}</Text>
          </View>
          <View style={styles.content}>{sidebarContent}</View>
        </Animated.View>
      </PanGestureHandler>
    </SidebarContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: '100%',
    backgroundColor: 'black',
    zIndex: 9998,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    width: SIDEBAR_WIDTH,
    height: '100%',
    backgroundColor: '#000',
    zIndex: 9999,
    paddingTop: 75,
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    color: '#fff',
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  edgeZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 20,
    zIndex: 9997,
  },
});
