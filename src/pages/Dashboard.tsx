import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { DashboardStats } from '../types';
import { 
  Users, 
  GraduationCap, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import clsx from 'clsx';

export function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load dashboard', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const cards = [
    { 
      title: 'Total Students', 
      value: stats?.totalStudents || 0, 
      icon: Users, 
      color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
    },
    { 
      title: 'Total Classes', 
      value: stats?.totalClasses || 0, 
      icon: GraduationCap, 
      color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
    },
    { 
      title: 'Current Revenue', 
      value: `$${(stats?.monthlyRevenue || 0).toLocaleString()}`, 
      icon: DollarSign, 
      color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
    },
    { 
      title: 'Attendance Rate', 
      value: `${(stats?.attendanceRate || 0).toFixed(1)}%`, 
      icon: Activity, 
      color: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
    }
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
            Welcome back, {user?.name.split(' ')[0]}! 👋
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Here's what's happening with your classes today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-semibold text-zinc-900 dark:text-white">{format(new Date(), 'EEEE, MMMM do')}</span>
            <span className="text-xs text-zinc-500">{format(new Date(), 'h:mm a')}</span>
          </div>
          <button className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm">
            <Calendar size={20} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {cards.map((card, idx) => (
          <motion.div 
            key={idx}
            variants={item}
            className="bg-white dark:bg-zinc-800 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-700 flex flex-col transition-all hover:shadow-md group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={clsx("p-3 rounded-xl transition-transform group-hover:scale-110", card.color)}>
                <card.icon size={24} />
              </div>
            </div>
            <span className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">{card.title}</span>
            <span className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{card.value}</span>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Chart Placeholder/Visual */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2 bg-white dark:bg-zinc-800 rounded-3xl p-8 border border-zinc-100 dark:border-zinc-700 shadow-sm"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Fee Analysis</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Monthly breakdown of your earnings</p>
            </div>
            <select className="bg-zinc-50 dark:bg-zinc-700 border-none rounded-xl text-sm font-medium px-4 py-2 outline-none">
              <option>Last 6 months</option>
              <option>Last year</option>
            </select>
          </div>

          <div className="h-64 flex items-end justify-between gap-4 px-2">
            {stats?.revenueByMonth.map((data, i) => {
              const maxAmount = Math.max(...stats.revenueByMonth.map(d => d.amount), 1);
              const height = (data.amount / maxAmount) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                  <div className="w-full relative">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                      className="w-full bg-indigo-600/10 dark:bg-indigo-400/10 rounded-t-xl group-hover:bg-indigo-600/20 dark:group-hover:bg-indigo-400/20 transition-colors relative"
                    >
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                        className="absolute bottom-0 w-full bg-indigo-600 dark:bg-indigo-500 rounded-t-xl"
                      />
                    </motion.div>
                    {/* Tooltip on hover */}
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-xs font-bold py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                      ${data.amount.toLocaleString()}
                    </div>
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-tighter">
                    {data.month.split('-')[1]}/{data.month.split('-')[0].slice(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Recent Activity Feed */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-zinc-50 dark:bg-zinc-900/40 rounded-[2.5rem] p-8 border border-zinc-100 dark:border-zinc-800 shadow-xl shadow-zinc-200/20 dark:shadow-none overflow-hidden relative"
        >
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Recent Activity</h2>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Live updates</p>
              </div>
              <button className="w-10 h-10 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-indigo-600 transition-colors shadow-sm">
                <MoreVertical size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {stats?.recentPayments.map((payment, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={i} 
                  className="bg-white dark:bg-zinc-800 p-4 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-700/50 flex items-center gap-5 group hover:translate-x-1 transition-all"
                >
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-extrabold text-xl shadow-inner uppercase">
                      {payment.studentName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-emerald-500 border-4 border-white dark:border-zinc-800 flex items-center justify-center">
                      <CheckCircle2 size={12} className="text-white" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-zinc-900 dark:text-white truncate">
                      {payment.studentName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                        <Clock size={10} />
                        {format(new Date(payment.date), 'h:mm a')}
                      </div>
                      <span className="w-1 h-1 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                      <span className="text-[10px] font-bold text-indigo-500/80 dark:text-indigo-400/80 uppercase tracking-tighter">
                        Success
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-right whitespace-nowrap">
                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-500 tabular-nums">
                      +${payment.amount.toLocaleString()}
                    </p>
                  </div>
                </motion.div>
              ))}
              
              {(!stats?.recentPayments || stats.recentPayments.length === 0) && (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-zinc-100/50 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-6 text-zinc-300">
                    <Clock size={40} />
                  </div>
                  <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Quiet day so far...</p>
                  <p className="text-xs text-zinc-500 mt-2">No payments recorded recently.</p>
                </div>
              )}
            </div>

            <button className="w-full mt-6 py-4 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 text-zinc-400 text-xs font-bold uppercase tracking-widest hover:border-indigo-300 hover:text-indigo-500 dark:hover:border-indigo-900 transition-all">
              View All History
            </button>
            <div className="mt-8 p-6 bg-indigo-600 rounded-[2rem] text-white relative overflow-hidden group shadow-lg shadow-indigo-200 dark:shadow-none">
              <div className="relative z-10">
                <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest mb-1">Weekly Enrollment Goal</p>
                <h3 className="text-xl font-black">Target reach: 84%</h3>
                <div className="mt-4 w-full bg-white/20 rounded-full h-2 overflow-hidden backdrop-blur-sm">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '84%' }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="bg-white h-full" 
                  />
                </div>
                <p className="mt-3 text-[10px] text-indigo-100 font-medium">4 more students to reach your weekly milestone!</p>
              </div>
              <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
                <TrendingUp size={120} />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Attendance Trend */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white dark:bg-zinc-800 rounded-3xl p-8 border border-zinc-100 dark:border-zinc-700 shadow-sm"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Attendance Trend</h2>
            <div className="flex gap-2">
              <span className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
                <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                Present
              </span>
            </div>
          </div>
          
          <div className="h-40 flex items-end justify-between gap-1 px-2">
            {stats?.attendanceByDay.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="w-full relative flex items-end h-full">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${day.rate}%` }}
                    className="w-full bg-indigo-500 dark:bg-indigo-600 rounded-lg group-hover:bg-indigo-400 transition-colors"
                  />
                </div>
                <span className="text-[10px] font-bold text-zinc-400">{format(new Date(day.date), 'EEE')}</span>
              </div>
            ))}
            {(!stats?.attendanceByDay || stats.attendanceByDay.length === 0) && (
              <div className="w-full h-full flex items-center justify-center text-zinc-400 text-sm italic">
                No attendance data for past 7 days
              </div>
            )}
          </div>
        </motion.div>

        {/* System Snapshot */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white dark:bg-zinc-800 rounded-3xl p-8 border border-zinc-100 dark:border-zinc-700 shadow-sm"
        >
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-6">System Snapshot</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-700/50 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                  <Users size={20} />
                </div>
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">New Enrollments</span>
              </div>
              <span className="text-lg font-bold text-zinc-900 dark:text-white">
                {stats?.studentGrowth[stats.studentGrowth.length-1]?.count || 0}
                <span className="text-xs text-zinc-400 ml-1 font-normal">this month</span>
              </span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-700/50 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center">
                  <CheckCircle2 size={20} />
                </div>
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">Pending Actions</span>
              </div>
              <span className="text-lg font-bold text-zinc-900 dark:text-white">3</span>
            </div>
          </div>
          
          <div className="mt-8 text-center text-xs text-zinc-400">
            Automated notifications are currently <span className="text-emerald-500 font-bold uppercase">Active</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
