import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { api } from '../api';

export default function DashboardScreen({ setLoggedIn }: any) {
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await api.getDashboard();
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogout = async () => {
    await api.logout();
    setLoggedIn(false);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading Dashboard...</Text>
      </View>
    );
  }

  // Helper arrays
  const students = data?.students || [];
  const attendance = data?.attendance || [];
  const payments = data?.payments || [];

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Parent Dashboard</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Students ({students.length})</Text>
        {students.length === 0 ? (
          <Text style={styles.emptyText}>No students linked to your account yet.</Text>
        ) : (
          students.map((s: any) => (
            <View key={s.id} style={styles.card}>
              <Text style={styles.cardTitle}>{s.name}</Text>
              <Text style={styles.cardSubject}>Class: {s.className || 'None'}</Text>
              <Text style={styles.cardMeta}>Subjects: {s.subjects}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Attendance</Text>
        {attendance.length === 0 ? (
          <Text style={styles.emptyText}>No recent attendance records.</Text>
        ) : (
          attendance.slice(0, 10).map((a: any) => {
            const stu = students.find((x: any) => x.id === a.studentId);
            return (
              <View key={a.id} style={styles.rowItem}>
                <View>
                  <Text style={styles.rowTextMain}>{stu ? stu.name : 'Unknown'}</Text>
                  <Text style={styles.rowTextSub}>{new Date(a.date).toLocaleDateString()}</Text>
                </View>
                <View style={[styles.badge, a.status === 'Present' ? styles.badgePresent : styles.badgeAbsent]}>
                  <Text style={[styles.badgeText, a.status === 'Present' ? styles.textPresent : styles.textAbsent]}>{a.status}</Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Payments</Text>
        {payments.length === 0 ? (
          <Text style={styles.emptyText}>No recent payments.</Text>
        ) : (
          payments.slice(0, 10).map((p: any) => {
            const stu = students.find((x: any) => x.id === p.studentId);
            return (
              <View key={p.id} style={styles.rowItem}>
                <View>
                  <Text style={styles.rowTextMain}>{stu ? stu.name : 'Unknown'}</Text>
                  <Text style={styles.rowTextSub}>{new Date(p.date).toLocaleDateString()}</Text>
                  {p.notes ? <Text style={styles.rowNotes}>{p.notes}</Text> : null}
                </View>
                <Text style={styles.amountText}>${p.amount}</Text>
              </View>
            );
          })
        )}
      </View>
      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#0070f3',
    paddingTop: 60, // Safe area approx
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  logoutBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    padding: 20,
    paddingBottom: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
    fontStyle: 'italic',
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  cardSubject: {
    fontSize: 14,
    color: '#4b5563',
    marginTop: 4,
  },
  cardMeta: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0070f3',
  },
  rowTextMain: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  rowTextSub: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  rowNotes: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
    maxWidth: 200,
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgePresent: {
    backgroundColor: '#d1fae5',
  },
  badgeAbsent: {
    backgroundColor: '#fee2e2',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  textPresent: {
    color: '#065f46',
  },
  textAbsent: {
    color: '#991b1b',
  },
  bottomSpace: {
    height: 40,
  }
});
