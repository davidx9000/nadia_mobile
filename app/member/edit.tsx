import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
  Dimensions,
  FlatList
} from 'react-native';
import { router, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'expo-image';
import api from '@/services/axios';
import { useSession } from '@/context/authSession';
import { useWebSocket } from '@/context/WebSocketContext';
import { validateName, validateUsername } from '@/utils/validators';

const screenWidth = Dimensions.get('window').width;
const baseUrl = 'https://avatars.nadiaradio.com';

export default function EditProfile() {
  const [form, setForm] = useState({
    name: '',
    username: '',
    avatar: null as string | null,
  });
  const [loading, setLoading] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showAvatarList, setShowAvatarList] = useState(false);
  const [avatarList, setAvatarList] = useState<string[]>([]);

  const { session, signIn } = useSession();
  const { on, off, emit, isConnected, chatStation } = useWebSocket();
  const navigation = useNavigation();
  const alertTitle = 'Edit Profile';

  useEffect(() => {
  async function fetchAvatars() {
    try {
      const response = await fetch(`${baseUrl}/list.json`);
      const files: string[] = await response.json();
      const urls = files.map(filename => `${baseUrl}/${filename}`);
      setAvatarList(urls);

      // Prefetch all avatars to avoid blank loading
      urls.forEach(uri => {
        Image.prefetch(uri);
      });
    } catch (error) {
      console.error('Failed to fetch avatars', error);
    }
  }
  fetchAvatars();
}, []);

  useEffect(() => {
    if (!session) {
      router.replace('/login');
      return;
    }
    setForm({
      name: session.user?.name || '',
      username: session.user?.username || '',
      avatar: session.user?.avatar || null,
    });
  }, [session]);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      handleChange('avatar', result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    const trimName = form.name.trim();
    const nameValidation = validateName(trimName);
    if (!nameValidation.isValid) {
      Alert.alert(alertTitle, nameValidation.message);
      return;
    }

    const trimUsername = form.username.trim();
    const usernameValidation = validateUsername(trimUsername);
    if (!usernameValidation.isValid) {
      Alert.alert(alertTitle, usernameValidation.message);
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();

      formData.append('username', trimUsername);
      formData.append('name', trimName);

      if (form.avatar && !form.avatar.includes('/assets/avatars/')) {
        const manipulatedImage = await ImageManipulator.manipulateAsync(
          form.avatar,
          [],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );

        formData.append('avatar', {
          uri: manipulatedImage.uri,
          name: 'avatar.jpg',
          type: 'image/jpeg',
        } as any);
      } else {
        formData.append('avatar', form.avatar || '');
      }

      const response = await api.post('/member/profile/edit', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `${session?.token}`,
        },
      });
      signIn({
        ...response.data.session,
        walletSession: session?.walletSession || null,
      });
      if (isConnected && response.data.session.token) {
        emit('joinChat', { token: response.data.session.token, station: chatStation });
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert(alertTitle, err?.response?.data?.message || 'Failed to update at this time.');
    } finally {
      setLoading(false);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Edit Profile',
      headerTitleAlign: 'center',
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          <Text style={[styles.saveText, loading && styles.disabledSave]}>Save</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleSave]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={() => setShowAvatarPicker(true)} style={styles.avatarContainer}>
            {form.avatar ? (
              <Image source={{ uri: form.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.placeholderAvatar}>
                <Ionicons name="person" size={50} color="#999" />
              </View>
            )}
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarText}>Tap to change photo</Text>
        </View>

        <View style={[styles.inputSection, styles.borderTop]}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            value={form.username}
            style={styles.input}
            onChangeText={(text) => handleChange('username', text)}
            placeholder="Enter your username"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            value={form.name}
            style={styles.input}
            onChangeText={(text) => handleChange('name', text)}
            placeholder="Enter your name"
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {/* Modal: Choose Avatar Source */}
      <Modal visible={showAvatarPicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <TouchableOpacity onPress={() => { setShowAvatarPicker(false); pickImage(); }}>
              <Text style={styles.modalOption}>Pick from Device</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowAvatarPicker(false); setShowAvatarList(true); }}>
              <Text style={styles.modalOption}>Choose Avatar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAvatarPicker(false)}>
              <Text style={[styles.modalOption, { color: 'red' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal: Avatar List */}
      <Modal visible={showAvatarList} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.avatarGrid}>
            <Text style={styles.modalTitle}>Choose Your Avatar</Text>          
            <FlatList
              data={avatarList}
              keyExtractor={(_, index) => index.toString()}
              numColumns={3} // show 4 avatars per row; adjust as needed
              initialNumToRender={12} // render only first 12 initially
              contentContainerStyle={styles.avatarRow}
              renderItem={({ item: uri }) => (
                <TouchableOpacity
                  onPress={() => {
                    handleChange('avatar', uri);
                    setShowAvatarList(false);
                  }}
                  style={styles.avatarWrapper}
                >
                  <Image
                    source={{ uri }}
                    style={styles.avatarOption}
                    contentFit="cover"
                    transition={1000} 
                  />
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity onPress={() => setShowAvatarList(false)}>
              <Text style={[styles.modalOption, { color: 'red' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  cancelText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    paddingVertical: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  placeholderAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#8427d9',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarText: {
    color: '#666',
    fontSize: 14,
  },
  inputSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    gap: 20,
  },
  borderTop: {
    borderTopWidth: 1,
    borderColor: '#ddd',
  },
  label: {
    width: '30%',
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    width: '100%',
    borderWidth: 0,
    fontSize: 16,
    backgroundColor: 'transparent',
  },
  saveText: {
    color: '#8427d9',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledSave: {
    color: '#ccc',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    width: 250,
    alignItems: 'center',
  },
  modalOption: {
    fontSize: 16,
    paddingVertical: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  avatarGrid: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    alignItems: 'center',
  },
  avatarRow: {
    width: '100%',
  },
  avatarWrapper: {
    alignItems: 'center',
    marginHorizontal: 10,
    marginVertical: 10,
  },
  avatarOption: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: '#ccc',
  },
});
