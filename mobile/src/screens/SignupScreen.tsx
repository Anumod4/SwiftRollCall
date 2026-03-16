import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { storage } from '../storage';
import { api } from '../api';

export default function SignupScreen({ navigation, setLoggedIn }: any) {
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!identifier) {
      Alert.alert('Error', 'Please enter your email or phone number');
      return;
    }

    setLoading(true);
    console.log('Verifying identifier:', identifier);
    try {
      const trimmedId = identifier.trim();
      const response = await api.verifyStudents(trimmedId);
      console.log('Verification response:', response);
      if (response.students && response.students.length > 0) {
        setStudents(response.students);
        setStep(2);
      } else {
        Alert.alert('No students found', 'We couldn\'t find any students matching details. Please contact the tutor.');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      Alert.alert('Error', error.message || 'Failed to verify details.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!name || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const trimmedId = identifier.trim();
      const isEmail = trimmedId.includes('@');
      const signupData = {
        name,
        email: isEmail ? trimmedId : undefined,
        phone: !isEmail ? trimmedId : undefined,
        password,
      };

      console.log('Signup: Starting API call...');
      const response = await api.signup(signupData);
      console.log('Signup: API Success, saving to storage...', response);
      await storage.save('parentToken', response.token);
      await storage.save('parentUser', JSON.stringify(response.user));
      console.log('Signup: Storage saved, setting loggedIn to true');
      
      Alert.alert(
        'Success', 
        'Account created successfully!',
        [{ text: 'OK', onPress: () => setLoggedIn(true) }]
      );
    } catch (error: any) {
      console.error('Signup: Error occurred:', error);
      if (error.message.includes('already exists')) {
        Alert.alert(
          'Account Exists', 
          'An account with this email/phone already exists. Please try logging in instead.',
          [{ text: 'Go to Login', onPress: () => navigation.navigate('Login') }]
        );
      } else {
        Alert.alert('Signup failed', error.message || 'Failed to create account.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Parent Sign Up</Text>
          
          {step === 1 && (
            <>
              <Text style={styles.subtitle}>Enter your email or phone number to find your children's records</Text>
              <TextInput
                style={styles.input}
                placeholder="Email or Phone Number"
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Find My Children</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Login')}>
                <Text style={styles.linkText}>Already have an account? Log In</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.subtitle}>We found {students.length} student(s) linked to your details. Please confirm these are your children:</Text>
              <View style={styles.studentList}>
                {students.map((s) => (
                  <View key={s.id} style={styles.studentItem}>
                    <Text style={styles.studentName}>{s.name}</Text>
                    <Text style={styles.studentClass}>{s.className || 'No Class Assigned'}</Text>
                  </View>
                ))}
              </View>
              
              <Text style={styles.stepTitle}>Complete Your Profile</Text>
              <TextInput
                style={styles.input}
                placeholder="Your Full Name"
                value={name}
                onChangeText={setName}
              />
              <TextInput
                style={styles.input}
                placeholder="Choose Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />

              <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.linkButton} onPress={() => setStep(1)}>
                <Text style={styles.linkText}>Go Back</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 20,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f9fafb',
  },
  button: {
    backgroundColor: '#0070f3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#0070f3',
    fontSize: 15,
  },
  studentList: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  studentItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  studentClass: {
    fontSize: 14,
    color: '#6b7280',
  },
});
