import { defineMessages } from "../define";

export const dashboard = defineMessages({
  en: {
    dashboard: {
      greeting: {
        morning: "Good morning, {name}",
        afternoon: "Good afternoon, {name}",
        evening: "Good evening, {name}",
      },
      subtitle: "Here's how the business is doing.",
      vsPrevious: "vs previous period",
      kpi: {
        net: "Net sales",
        avgTicket: "Average sale",
        appointments: "Appointments",
        newClients: "New clients",
        salesHint: "{count} sales",
        completedHint: "{count} completed",
        noShowHint: "{count} no-shows",
      },
      revenue: {
        title: "Revenue",
        current: "This period",
        previous: "Previous period",
        empty: "No sales in this period yet",
      },
      statuses: {
        title: "Appointments by status",
        empty: "No appointments in this period",
      },
      topServices: "Top services",
      topStaff: "Top team members",
      servicesCount: "{count} services",
      noData: "Nothing to show yet",
      today: {
        title: "Today",
        empty: "No appointments today",
        emptyHint: "Walk-ins and new bookings will appear here.",
        openCalendar: "Open calendar",
        more: "+{count} more today",
      },
      recent: {
        title: "Recent sales",
        viewAll: "View all",
        empty: "No sales yet",
      },
    },
  },
  ar: {
    dashboard: {
      greeting: {
        morning: "صباح الخير، {name}",
        afternoon: "مساء الخير، {name}",
        evening: "مساء الخير، {name}",
      },
      subtitle: "إليك نظرة على أداء النشاط.",
      vsPrevious: "مقارنة بالفترة السابقة",
      kpi: {
        net: "صافي المبيعات",
        avgTicket: "متوسط الفاتورة",
        appointments: "المواعيد",
        newClients: "عملاء جدد",
        salesHint: "{count} عملية بيع",
        completedHint: "{count} مكتمل",
        noShowHint: "{count} لم يحضر",
      },
      revenue: {
        title: "الإيرادات",
        current: "هذه الفترة",
        previous: "الفترة السابقة",
        empty: "لا توجد مبيعات في هذه الفترة بعد",
      },
      statuses: {
        title: "المواعيد حسب الحالة",
        empty: "لا توجد مواعيد في هذه الفترة",
      },
      topServices: "الخدمات الأعلى مبيعًا",
      topStaff: "أفضل أعضاء الفريق",
      servicesCount: "{count} خدمة",
      noData: "لا توجد بيانات بعد",
      today: {
        title: "اليوم",
        empty: "لا توجد مواعيد اليوم",
        emptyHint: "ستظهر هنا الزيارات المباشرة والحجوزات الجديدة.",
        openCalendar: "فتح التقويم",
        more: "+{count} مواعيد أخرى اليوم",
      },
      recent: {
        title: "أحدث المبيعات",
        viewAll: "عرض الكل",
        empty: "لا توجد مبيعات بعد",
      },
    },
  },
});
