// app/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
  CartesianGrid,
  LabelList,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { 
  DollarSign, 
  Package, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  Clock,
  RefreshCw,
  Activity,
  BarChart2,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Trophy,
  Star,
  Bell,
  Calendar,
  User,
  Building
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({
    allRevenue: 0,
    completedOrdersRevenue: 0,
    totalOrders: 0,
    newCustomers: 0,
    growthRate: "0",
    totalWaste: 0,
    userBranch: "",
    branchName: "",
    branchType: "",
    branchLocation: "",
    debugInfo: null as any,
  });
  const [error, setError] = useState<string | null>(null);
  const [salesData, setSalesData] = useState([]);
  const [bestTeams, setBestTeams] = useState<any[]>([]);
  const [bestEmployees, setBestEmployees] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAllData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchMetrics(),
      fetchSalesData(),
      fetchBestTeamsData(),
      fetchBestEmployeesData(),
      fetchNoticesData()
    ]);
    setIsLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  const fetchMetrics = async () => {
    try {
      setError(null);
      const res = await fetch("/api/metrics");
      const data = await res.json();
      if (res.ok) {
        setMetrics({
          allRevenue: data.allRevenue ?? 0,
          completedOrdersRevenue: data.completedOrdersRevenue ?? 0,
          totalOrders: data.totalOrders ?? 0,
          newCustomers: data.newCustomers ?? 0,
          growthRate: data.growthRate ?? "0",
          totalWaste: data.totalWaste ?? 0,
          userBranch: data.userBranch ?? "",
          branchName: data.branchName ?? "",
          branchType: data.branchType ?? "",
          branchLocation: data.branchLocation ?? "",
          debugInfo: data.debugInfo || null,
        });
      } else {
        console.error("Error fetching metrics:", data.error);
        setError(`Metrics Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error fetching metrics:", error);
      setError("Failed to fetch metrics");
    }
  };

  const fetchSalesData = async () => {
    try {
      const res = await fetch("/api/sales");
      const data = await res.json();
      if (res.ok) {
        setSalesData(data.salesData);
      } else {
        console.error("Error fetching sales data:", data.error);
        setError(`Sales Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error fetching sales data:", error);
      setError("Failed to fetch sales data");
    }
  };

  const fetchBestTeamsData = async () => {
    try {
      const res = await fetch("/api/notices?type=best_team&isActive=true");
      const data = await res.json();
      if (res.ok && data.success) {
        setBestTeams(data.notices ?? []);
      } else {
        setBestTeams([]);
      }
    } catch (error) {
      setBestTeams([]);
    }
  };
  const fetchBestEmployeesData = async () => {
    try {
      const res = await fetch("/api/notices?type=best_employee&isActive=true");
      const data = await res.json();
      if (res.ok && data.success) {
        setBestEmployees(data.notices ?? []);
      } else {
        setBestEmployees([]);
      }
    } catch (error) {
      setBestEmployees([]);
    }
  };

  const fetchNoticesData = async () => {
    try {
      const res = await fetch("/api/notices?isActive=true");
      const data = await res.json();
      if (res.ok && data.success) {
        setNotices(data.notices ?? []);
      } else {
        console.warn("Failed to fetch notices:", data.error || "Unknown error");
        setNotices([]);
      }
    } catch (error) {
      console.error("Error fetching notices data:", error);
      setNotices([]);
    }
  };

  // Helper function to determine growth indicator styles
  const getGrowthIndicator = (value: any) => {
    if (!value || value === "N/A") return null;
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return null;
    
    if (numValue > 0) {
      return {
        icon: <ArrowUpRight className="h-4 w-4 text-green-500" />,
        color: "text-green-500",
        text: `+${numValue}%`
      };
    } else if (numValue < 0) {
      return {
        icon: <ArrowDownRight className="h-4 w-4 text-red-500" />,
        color: "text-red-500",
        text: `${numValue}%`
      };
    } else {
      return {
        icon: <Activity className="h-4 w-4 text-gray-500" />,
        color: "text-gray-500",
        text: "0%"
      };
    }
  };

  const growthIndicator = getGrowthIndicator(metrics.growthRate);

  // Custom tooltip styles
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg">
          <p className="font-medium text-gray-800">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} className={`text-sm text-[${entry.color}]`}>
              {`${entry.name}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Show loading state if user is not yet loaded
  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <RefreshCw className="h-12 w-12 text-blue-500 animate-spin" />
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center">
              <BarChart2 className="mr-3 h-6 w-6 text-blue-600" />
              Dashboard
            </h1>
            {user && (
              <p className="text-sm text-gray-600 ml-9">
                {user.branchName} • {user.branchType.charAt(0).toUpperCase() + user.branchType.slice(1)} Branch
              </p>
            )}
          </div>
          
          {user && (
            <div className="flex items-center space-x-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2">
                <Building className="h-5 w-5 text-blue-600" />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-blue-800">
                    {user.branchName}
                  </span>
                  <span className="text-xs text-blue-600">
                    {user.branchType.charAt(0).toUpperCase() + user.branchType.slice(1)} Branch • {user.branchLocation}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {metrics.userBranch && metrics.userBranch !== user?.branch && (
            <div className="flex items-center space-x-2 px-3 py-2 bg-yellow-50 rounded-lg border border-yellow-200">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                Data from: {metrics.userBranch}
              </span>
            </div>
          )}
          
          {error && (
            <div className="flex items-center space-x-2 px-3 py-2 bg-red-50 rounded-lg border border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">
                {error}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          <Link href="/notices">
            <Button variant="outline" size="sm" className="rounded-lg border-gray-200">
              <Bell className="h-4 w-4 mr-2" />
              Manage Notices
            </Button>
          </Link>
          {error && (
            <Button 
              onClick={() => setError(null)} 
              variant="outline"
              size="sm"
              className="rounded-lg border-red-200 text-red-600 hover:bg-red-50"
            >
              Clear Error
            </Button>
          )}
          <Button 
            onClick={fetchAllData} 
            variant="outline"
            className="rounded-lg border-gray-200"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Refreshing...' : 'Refresh Data'}
          </Button>
        </div>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-gray-100">
            <CardTitle className="text-sm font-medium text-gray-600">All Revenue</CardTitle>
            <div className="p-2 bg-green-50 rounded-full">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-gray-900">
              Rs {(metrics.allRevenue ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-gray-500">From Orders • {user.branchName}</p>
              {growthIndicator && (
                <div className={`flex items-center ${growthIndicator.color} text-xs font-medium`}>
                  {growthIndicator.icon}
                  <span className="ml-1">{growthIndicator.text}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-gray-100">
            <CardTitle className="text-sm font-medium text-gray-600">Completed Orders Revenue</CardTitle>
            <div className="p-2 bg-emerald-50 rounded-full">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-gray-900">
              Rs {(metrics.completedOrdersRevenue ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500 mt-1">From Completed Tasks • {user.branchName}</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-gray-100">
            <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
            <div className="p-2 bg-blue-50 rounded-full">
              <Package className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-gray-900">
              {(metrics.totalOrders ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">From last 30 days • {user.branchName}</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-gray-100">
            <CardTitle className="text-sm font-medium text-gray-600">New Customers</CardTitle>
            <div className="p-2 bg-purple-50 rounded-full">
              <Users className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-gray-900">
              {(metrics.newCustomers ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">Unique emails from last 30 days</p>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-gray-100">
            <CardTitle className="text-sm font-medium text-gray-600">Growth Rate</CardTitle>
            <div className="p-2 bg-indigo-50 rounded-full">
              <TrendingUp className="h-4 w-4 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-gray-900">
              {metrics.growthRate !== "N/A" ? `${metrics.growthRate}%` : "N/A"}
            </div>
            <p className="text-xs text-gray-500 mt-1">Compared to previous 30 days</p>
          </CardContent>
        </Card>
      </div>

     

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-gray-100">
            <CardTitle className="text-sm font-medium text-gray-600">Total Waste</CardTitle>
            <div className="p-2 bg-amber-50 rounded-full">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-gray-900">
              {(metrics.totalWaste ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">Waste from order items (last 30 days)</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-gray-100">
            <CardTitle className="text-sm font-medium text-gray-600">Best Teams</CardTitle>
            <div className="p-2 bg-orange-50 rounded-full">
              <Trophy className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            {isLoading ? (
              <div className="flex justify-center items-center h-20">
                <RefreshCw className="h-6 w-6 text-orange-500 animate-spin" />
              </div>
            ) : bestTeams.length === 0 ? (
              <div className="text-gray-500 text-sm">No best team notices</div>
            ) : (
              bestTeams.map((team) => (
                <div key={team._id} className="mb-2 border-b last:border-b-0 pb-2 last:pb-0">
                  <div className="font-bold text-gray-900">{team.teamName}</div>
                  {team.teamMembers && team.teamMembers.length > 0 && (
                    <div className="text-xs text-gray-500">Members: {team.teamMembers.join(', ')}</div>
                  )}
                  <div className="text-xs text-gray-400">{new Date(team.startDate).toLocaleDateString()}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-gray-100">
            <CardTitle className="text-sm font-medium text-gray-600">Best Employees</CardTitle>
            <div className="p-2 bg-yellow-50 rounded-full">
              <Star className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            {isLoading ? (
              <div className="flex justify-center items-center h-20">
                <RefreshCw className="h-6 w-6 text-yellow-500 animate-spin" />
              </div>
            ) : bestEmployees.length === 0 ? (
              <div className="text-gray-500 text-sm">No best employee notices</div>
            ) : (
              bestEmployees.map((emp) => (
                <div key={emp._id} className="mb-2 border-b last:border-b-0 pb-2 last:pb-0">
                  <div className="font-bold text-gray-900">{emp.employeeName}</div>
                  <div className="text-xs text-gray-400">{new Date(emp.startDate).toLocaleDateString()}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="bg-gray-50 border-b border-gray-100 pb-4">
            <CardTitle className="flex items-center text-lg">
              <BarChart2 className="mr-2 h-5 w-5 text-blue-600" />
              Revenue Comparison (Last 7 Days) • {user.branchName}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex justify-center items-center h-[300px]">
                <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
              </div>
            ) : salesData.length === 0 ? (
              <div className="flex flex-col justify-center items-center h-[300px] text-gray-500">
                <BarChart2 className="h-12 w-12 text-gray-300 mb-3" />
                <p className="text-gray-500">No sales data available</p>
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ChartContainer
                  config={{
                    allRevenue: {
                      label: "All Revenue",
                      color: "hsl(var(--chart-1))",
                    },
                    completedRevenue: {
                      label: "Completed Orders Revenue",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                  className="h-full w-full"
                >
                  <BarChart
                    data={salesData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={36}
                      iconType="circle"
                      iconSize={8}
                    />
                    <Bar
                      dataKey="allRevenue"
                      fill="hsl(var(--chart-1))"
                      radius={[4, 4, 0, 0]}
                      barSize={25}
                      name="All Revenue"
                    >
                      <LabelList
                        position="top"
                        offset={12}
                        className="fill-foreground"
                        fontSize={10}
                        formatter={(value: any) => value > 0 ? `Rs ${value}` : ''}
                      />
                    </Bar>
                    <Bar
                      dataKey="completedRevenue"
                      fill="hsl(var(--chart-2))"
                      radius={[4, 4, 0, 0]}
                      barSize={25}
                      name="Completed Orders Revenue"
                    >
                      <LabelList
                        position="top"
                        offset={12}
                        className="fill-foreground"
                        fontSize={10}
                        formatter={(value: any) => value > 0 ? `Rs ${value}` : ''}
                      />
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="bg-gray-50 border-b border-gray-100 pb-4">
            <CardTitle className="flex items-center text-lg">
              <Bell className="mr-2 h-5 w-5 text-red-600" />
              Notice Board
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="flex justify-center items-center h-[300px]">
                <RefreshCw className="h-8 w-8 text-red-500 animate-spin" />
              </div>
            ) : notices.filter(n => n.type === 'other').length === 0 ? (
              <div className="flex flex-col justify-center items-center h-[300px] text-gray-500">
                <Bell className="h-12 w-12 text-gray-300 mb-3" />
                <p className="text-gray-500">No notices available</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto">
                {notices.filter(notice => notice.type === 'other').map((notice) => (
                  <div key={notice._id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{notice.title}</h4>
                        {/* No best_team or best_employee specific fields here */}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(notice.priority)}`}>
                          {notice.priority}
                        </span>
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                          Notice
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{notice.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(notice.startDate).toLocaleDateString()}
                      </div>
                      <div className="flex items-center">
                        <User className="h-3 w-3 mr-1" />
                        {notice.createdBy}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}