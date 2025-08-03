import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardEvent,
  AppState 
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { globalStyles } from '@/styles/global';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useSidebar, gestureHandlerRef  } from '@/components/Sidebar';
import { useWebSocket } from '@/context/WebSocketContext';
import { useSession } from '@/context/authSession';
import defaultAvatar from '@/assets/images/guest_user.jpg';

export default function ChatScreen() {
  const { on, off, emit, isConnected, chatStation } = useWebSocket();
  const { session } = useSession();
  const { openSidebar } = useSidebar();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [blockTime, setBlockTime] = useState(null);
  const appState = useRef(AppState.currentState);
  const backgroundSince = useRef(null);
  const disconnectTimeout = useRef(null);
  
  const messageRefs = useRef({});
  const scrollViewRef = useRef();
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [chatMessages]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardWillShow', () => {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100); // give layout time to update
      setKeyboardVisible(true);
    });
    const hideSub = Keyboard.addListener('keyboardWillHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!isConnected) return;

    emit('loadChat');
    if (session) {
      emit('joinChat', { token: session.token, station: chatStation });
    }

    const handleChatEvents = (data) => {
      switch (data.type) {
        case "loadChat":
          setChatMessages(data.chatHistory);
          break;
        case "chat":
          setChatMessages((prev) => [...prev, data.chatMessage]);
          break;
        case "userProfile":
          setUserProfile({ ...data.userInfo });
          break;
        case "onlineUsers":
          setOnlineUsers(data.users);
          break;
        case "error":
        case "system":
        case "invalidResponse":
          systemMessage(data.message);
          if (data.blockTime) localStorage.setItem('blockTime', data.blockTime);
          break;
        default:
          systemMessage("An unexpected error occurred. Please refresh the page.");
      }
    };

    on("chatStation", handleChatEvents);

    return () => {
      off("chatStation", handleChatEvents);
      emit("chatStation", { type: 'disconnect', station: chatStation });
    };

  }, [isConnected]);

  // Watcher foreground/background activity
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (appState.current.match(/active/) && nextAppState === 'background') {
        backgroundSince.current = Date.now();
        disconnectTimeout.current = setTimeout(() => {
          emit("chatStation", { type: 'disconnect', station: chatStation });
        }, 3 * 60 * 1000); // 3 minutes
      }

      if (appState.current.match(/background/) && nextAppState === 'active') {
        clearTimeout(disconnectTimeout.current);
        disconnectTimeout.current = null;

        const timeAway = Date.now() - backgroundSince.current;
        if (timeAway > 3 * 60 * 1000) {
          emit("loadChat");
          emit("joinChat", { token: session?.token, station: chatStation });
        }

        backgroundSince.current = null;
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [session, chatStation]);

  const sendMessage = () => {
    const currentTime = Date.now();

    if (blockTime && currentTime < blockTime) {
      const timeLeft = Math.ceil((blockTime - currentTime) / 1000);
      systemMessage(`You are still blocked. Please try again in ${formatTimeLeft(timeLeft)}.`);
      return;
    } else {
      setBlockTime(null);
    }

    const trimmed = inputMessage.trim();
    if (!trimmed) return;

    emit('chatStation', {
      type: 'message',
      token: session?.token,
      station: chatStation,
      content: trimmed,
    });

    setInputMessage('');
  };

  const systemMessage = (message) => {
    setChatMessages((prev) => [
      ...prev,
      { user: { name: 'System' }, content: message, timestamp: Date.now() },
    ]);
  };

  const getMessageClasses = (message) => {
    if (
      message?.user?.public_tag !== undefined &&
      message.user.public_tag === session?.user?.public_tag
    ) {
      return { flexDirection: 'row-reverse', gap: 8 };
    }
    return { flexDirection: 'row', gap: 2 };
  };

  const getReplyContent = (messageId) => {
    const replyMessage = chatMessages.find(msg => msg.id === messageId);
    if (!replyMessage) return '';

    const content = replyMessage.content.length > 150
      ? replyMessage.content.slice(0, 150) + '...'
      : replyMessage.content;

    return `${replyMessage.user.name}: ${content}`;
  };

  const formatTimeAgo = (timestamp) => {
    const now = Date.now();
    const diff = Math.floor((now - timestamp) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const formatTimeLeft = (seconds) => {
    if (seconds <= 0) return 'a moment';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    return `${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''}`;
  }

  const scrollToMessage = (messageId) => {
    const y = messageRefs.current[messageId];
    if (y !== undefined && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y, animated: true });
    }
  };
  const openOnlineUsers = () => {
    return openSidebar({
      title: 'Online Users',
      position: 'right',
      content: (
          <ScrollView 
            style={styles.userList}
            showsVerticalScrollIndicator={false}
            simultaneousHandlers={gestureHandlerRef}
          >
            {onlineUsers.map((user, index) => (
              <View key={user.id ?? index} style={styles.user}>
                <Image
                  source={user?.avatar ? { uri: user.avatar } : defaultAvatar}
                  style={styles.avatar}
                />
                <View style={styles.details}>
                  <View style={styles.nameRow}>
                    <Text style={styles.nameText}>{user.name}</Text>
                    {user.is_verified && (
                      <Ionicons name="checkmark-circle" size={16} color="#ad46ff" style={styles.verifiedBadge} />
                    )}
                  </View>
                  <Text style={styles.roleText}>
                    {user.role}
                    {user.username && (
                    <Text style={styles.tagText}> | @{user.username}</Text>
                    )}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

      ),
    })
  };

  return (
    <ThemedView style={[globalStyles.container, { paddingHorizontal: 0 }]}>
      <View style={[globalStyles.header, { paddingHorizontal: 16 }]}>
        <View style={globalStyles.headerIcon}>
          <Ionicons name="chatbubble-ellipses" size={26} style={globalStyles.headerIconStyle} />
        </View>
        <ThemedText style={globalStyles.headerTitle}>Live Chat</ThemedText>
        <View style={styles.sideIcons}>
          {session && (
            <TouchableOpacity
              onPress={openOnlineUsers}
            >
              <Ionicons name="people-circle-sharp" size={28} color="#8427d9" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? -25 : -25}
      >     
        <ScrollView
          style={[styles.chatContainer, { marginBottom: session ? 0 : (Platform.OS === 'ios' ? 0 : 25) }]}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            flexGrow: 1,
          }}
          ref={scrollViewRef}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {chatMessages.map((msg, index) => (
            <View key={index} style={[styles.messageRow, getMessageClasses(msg)]} >
              <Image source={ msg?.user?.avatar ? { uri: msg.user.avatar } : defaultAvatar } style={styles.avatar} />
              <View key={msg.id}
                    onLayout={event => {
                      messageRefs.current[msg.id] = event.nativeEvent.layout.y;
                    }} 
                    style={styles.messageBox}
              >
                <View style={styles.userInfo}>
                  <Text style={styles.username}>
                    {msg.user.name}
                    {msg?.user?.is_verified && <Ionicons name="checkmark-circle" size={12} color="#ad46ff" />}
                  </Text>
                  <Text style={styles.timestamp}>{formatTimeAgo(msg.timestamp)}</Text>
                </View>
                {msg?.in_reply_to && (
                  <TouchableOpacity
                    onPress={() => scrollToMessage(msg.in_reply_to)}
                    style={styles.quotedContainer}
                  >
                    <Text style={styles.quotedText}>
                      {getReplyContent(msg.in_reply_to)}
                    </Text>
                  </TouchableOpacity>
                )}
                <Text style={styles.messageText}>{msg.content}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

          {session ? (
          <View style={styles.inputWrapper}>
            <View style={styles.inputContainer}>
              <TextInput
                placeholder="Send a message..."
                value={inputMessage}
                onChangeText={setInputMessage}
                style={styles.input}
                multiline={true}
                numberOfLines={4}
                returnKeyType="default"
                blurOnSubmit={false}
                placeholderTextColor="#aaa"
              />
              <TouchableOpacity onPress={sendMessage}>
                <Ionicons name="send" size={24} color="#8427d9" />
              </TouchableOpacity>
            </View>
          </View>
          ) : (
          <View style={{ marginBottom: 25 }}>
            <TouchableOpacity onPress={() => router.push('/login')} style={styles.joinButton}>
              <View>
                <Text style={styles.buttonText}>Join Chat</Text>
              </View>
            </TouchableOpacity>
          </View>
          )}
        
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  chatContainer: {
    backgroundColor: '#0a0a0a',
    padding:15,
  },
  sideIcons: {
    flex:1,
    alignItems: 'flex-end',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex',
    marginBottom: 16,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  messageBox: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap:3,
    marginBottom: 2,
  },
  username: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
    textTransform: 'none',
  },
  timestamp: {
    color: '#888',
    fontSize: 11,
  },
  messageText: {
    color: '#eee',
    fontSize: 14,
  },
  quotedContainer: {
    backgroundColor: '#3e3e3e',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 5,
    borderLeftWidth: 2,
    borderLeftColor: '#b3b3b3',
    marginBottom:5,
  },
  quotedText: {
    color: 'white',
    fontSize: 12,
  },
  inputWrapper: {
    padding: 10,
    backgroundColor: '#0a0a0a',
    marginBottom: Platform.OS === 'ios' ? 25 : 40,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: Platform.OS === 'ios' ? 10 : 3,
    paddingHorizontal: 10,
    zIndex: 1000,
    borderRadius: 8,
    marginBottom: 5,
  },
  input: {
    flex: 1,
    color: '#000',
    fontSize: Platform.OS === 'ios' ? 14 : 12,
    paddingHorizontal: 8,
  },
  userList: {
    flex: 1,
    marginVertical: 0,
    marginBottom: Platform.OS === 'ios' ? 0 : 40,
  },
  user: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    marginBottom: 5,
    padding: 5,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  details: {
    flexDirection: 'column',
    lineHeight: 18,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nameText: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#fff',
  },
  roleText: {
    fontSize: 13,
    color: '#888',
    textTransform: 'capitalize',
  },
  tagText: {
    fontSize: 12,
    color: '#888',
    textTransform: 'default',
  },
  joinButton: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    bottom: 40,
    width: '80%',
    padding: 10,
    backgroundColor: 'rgba(132, 39, 217, 1)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
