import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'id' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation dictionaries
const translations = {
  id: {
    // Auth
    'auth.signIn': 'Masuk',
    'auth.signUp': 'Daftar',
    'auth.email': 'Email',
    'auth.password': 'Kata Sandi',
    'auth.name': 'Nama',
    'auth.confirmPassword': 'Konfirmasi Kata Sandi',
    'auth.forgotPassword': 'Lupa Kata Sandi?',
    'auth.alreadyHaveAccount': 'Sudah punya akun?',
    'auth.dontHaveAccount': 'Belum punya akun?',
    'auth.signOut': 'Keluar',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': 'Selamat datang kembali',
    'dashboard.checkInToday': 'Absen Hari Ini',
    'dashboard.currentTime': 'Waktu saat ini',
    'dashboard.alreadyCheckedIn': 'Sudah Absen',
    'dashboard.time': 'Waktu',
    'dashboard.checkInNow': 'Absen Sekarang',
    'dashboard.checkingLocation': 'Memeriksa lokasi...',
    'dashboard.makeValidLocation': 'Pastikan Anda berada di lokasi yang valid',
    'dashboard.validLocations': 'Lokasi Valid',
    'dashboard.radius': 'Radius',
    'dashboard.missedAttendance': 'Terlewat Absen?',
    'dashboard.requestMakeup': 'Ajukan permintaan makeup untuk absen yang terlewat',
    'dashboard.thisMonth': 'Bulan Ini',
    'dashboard.totalDays': 'Total Hari',
    'dashboard.present': 'Hadir',
    'dashboard.late': 'Terlambat',
    'dashboard.absent': 'Tidak Hadir',
    
    // Admin Dashboard
    'admin.dashboard': 'Dashboard Admin',
    'admin.welcomeBack': 'Selamat datang kembali',
    'admin.reports': 'Laporan',
    'admin.users': 'Pengguna',
    'admin.locations': 'Lokasi',
    'admin.shifts': 'Shift',
    'admin.makeupRequests': 'Permintaan Make-up',
    
    // Admin Reports
    'admin.filterExport': 'Filter & Ekspor',
    'admin.filterAttendanceData': 'Filter data absensi dan ekspor laporan',
    'admin.startDate': 'Tanggal Mulai',
    'admin.endDate': 'Tanggal Akhir',
    'admin.employee': 'Karyawan',
    'admin.allEmployees': 'Semua Karyawan',
    'admin.allStatuses': 'Semua Status',
    'admin.allMethods': 'Semua Metode',
    'admin.regular': 'Reguler',
    'admin.makeup': 'Make-up',
    'admin.reset': 'Reset',
    'admin.csv': 'CSV',
    'admin.attendanceReport': 'Laporan Absensi',
    'admin.recordsFound': 'catatan ditemukan',
    'admin.date': 'Tanggal',
    'admin.exportSuccess': 'Laporan berhasil diekspor!',
    
    // Admin User Management
    'admin.userManagement': 'Manajemen Pengguna',
    'admin.manageUsers': 'Kelola akun pengguna dan peran',
    'admin.admin': 'Admin',
    'admin.user': 'Pengguna',
    
    // Admin Location Management
    'admin.locationManagement': 'Manajemen Lokasi',
    'admin.manageValidLocations': 'Kelola lokasi absensi yang valid dengan koordinat GPS',
    'admin.addLocation': 'Tambah Lokasi',
    'admin.editLocation': 'Edit Lokasi',
    'admin.addNewLocation': 'Tambah Lokasi Baru',
    'admin.setupValidLocation': 'Atur lokasi absensi yang valid dengan koordinat GPS dan radius.',
    'admin.locationName': 'Nama Lokasi',
    'admin.locationNamePlaceholder': 'mis., Kantor Pusat',
    'admin.latitude': 'Latitude',
    'admin.longitude': 'Longitude',
    'admin.radiusMeters': 'Radius (meter)',
    'admin.active': 'Aktif',
    'admin.coordinates': 'Koordinat',
    'admin.status': 'Status',
    'admin.inactive': 'Tidak Aktif',
    'admin.deleteLocationConfirm': 'Apakah Anda yakin ingin menghapus lokasi ini?',
    'admin.locationCreated': 'Lokasi berhasil dibuat!',
    'admin.locationUpdated': 'Lokasi berhasil diperbarui!',
    'admin.locationDeleted': 'Lokasi berhasil dihapus!',
    
    // Admin Shift Management
    'admin.shiftManagement': 'Manajemen Shift',
    'admin.manageWorkShifts': 'Kelola shift kerja dan jadwal waktu',
    'admin.addShift': 'Tambah Shift',
    'admin.editShift': 'Edit Shift',
    'admin.addNewShift': 'Tambah Shift Baru',
    'admin.setupWorkShift': 'Atur waktu shift kerja untuk pelacakan absensi.',
    'admin.shiftName': 'Nama Shift',
    'admin.shiftNamePlaceholder': 'mis., Shift Pagi',
    'admin.startTime': 'Waktu Mulai',
    'admin.endTime': 'Waktu Selesai',
    'admin.duration': 'Durasi',
    'admin.hours': 'jam',
    'admin.dayType': 'Jenis Hari',
    'admin.selectDayType': 'Pilih Jenis Hari',
    'admin.dayType.weekday': 'Hari Kerja',
    'admin.dayType.weekend': 'Akhir Pekan',
    'admin.dayType.holiday': 'Hari Libur',
    'admin.dayType.all': 'Semua Hari',
    'admin.deleteShiftConfirm': 'Apakah Anda yakin ingin menghapus shift ini?',
    'admin.shiftCreated': 'Shift berhasil dibuat!',
    'admin.shiftUpdated': 'Shift berhasil diperbarui!',
    'admin.shiftDeleted': 'Shift berhasil dihapus!',
    
    // Admin Makeup Requests
    'admin.makeupRequestsTitle': 'Permintaan Make-up',
    'admin.reviewProcessRequests': 'Tinjau dan proses permintaan absensi make-up karyawan',
    'admin.reason': 'Alasan',
    'admin.submitted': 'Diajukan',
    'admin.reviewMakeupRequest': 'Tinjau Permintaan Make-up',
    'admin.reviewDetails': 'Tinjau detail dan setujui atau tolak permintaan make-up ini.',
    'admin.dateOfMissed': 'Tanggal Absen yang Terlewat',
    'admin.supportingDocument': 'Dokumen Pendukung',
    'admin.viewDocument': 'Lihat Dokumen',
    'admin.adminNotes': 'Catatan Admin',
    'admin.addNotesDecision': 'Tambahkan catatan tentang keputusan Anda...',
    'admin.reject': 'Tolak',
    'admin.approve': 'Setujui',
    'admin.makeupRequestApproved': 'Permintaan make-up disetujui dan catatan absensi dibuat!',
    'admin.makeupRequestRejected': 'Permintaan make-up ditolak.',
    
    // Status
    'status.HADIR': 'HADIR',
    'status.TERLAMBAT': 'TERLAMBAT',
    'status.MAKE_UP': 'MAKE UP',
    'status.pending': 'MENUNGGU',
    'status.approved': 'DISETUJUI',
    'status.rejected': 'DITOLAK',
    
    // General
    'general.success': 'Berhasil',
    'general.error': 'Error',
    'general.loading': 'Memuat...',
    'general.save': 'Simpan',
    'general.cancel': 'Batal',
    'general.delete': 'Hapus',
    'general.edit': 'Edit',
    'general.add': 'Tambah',
    'general.view': 'Lihat',
    'general.actions': 'Aksi',
    'general.name': 'Nama',
    'general.created': 'Dibuat',
    'general.role': 'Peran',
    'general.create': 'Buat',
    'general.update': 'Perbarui',
    'general.time': 'Waktu',
    'general.location': 'Lokasi',
    'general.method': 'Metode',
    
    // Attendance
    'attendance.history': 'Riwayat Absensi',
    'attendance.status': 'Status',
    'attendance.method': 'Metode',
    'attendance.location': 'Lokasi',
    'attendance.reason': 'Alasan',
    'attendance.noRecords': 'Tidak ada data absensi',
    
    // Notifications
    'notification.locationError': 'Error Lokasi',
    'notification.notValidLocation': 'Anda tidak berada di lokasi yang valid untuk absen',
    'notification.attendanceSuccess': 'Absen berhasil! Status',
    'notification.roleUpdated': 'Peran pengguna berhasil diperbarui!',
    
    // Language
    'language.indonesian': 'Bahasa Indonesia',
    'language.english': 'English'
  },
  en: {
    // Auth
    'auth.signIn': 'Sign In',
    'auth.signUp': 'Sign Up',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.name': 'Name',
    'auth.confirmPassword': 'Confirm Password',
    'auth.forgotPassword': 'Forgot Password?',
    'auth.alreadyHaveAccount': 'Already have an account?',
    'auth.dontHaveAccount': "Don't have an account?",
    'auth.signOut': 'Sign Out',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': 'Welcome back',
    'dashboard.checkInToday': 'Check In Today',
    'dashboard.currentTime': 'Current time',
    'dashboard.alreadyCheckedIn': 'Already Checked In',
    'dashboard.time': 'Time',
    'dashboard.checkInNow': 'Check In Now',
    'dashboard.checkingLocation': 'Checking location...',
    'dashboard.makeValidLocation': 'Make sure you\'re at a valid location',
    'dashboard.validLocations': 'Valid Locations',
    'dashboard.radius': 'Radius',
    'dashboard.missedAttendance': 'Missed Attendance?',
    'dashboard.requestMakeup': 'Request make-up time for missed check-ins',
    'dashboard.thisMonth': 'This Month',
    'dashboard.totalDays': 'Total Days',
    'dashboard.present': 'Present',
    'dashboard.late': 'Late',
    'dashboard.absent': 'Absent',
    
    // Admin Dashboard
    'admin.dashboard': 'Admin Dashboard',
    'admin.welcomeBack': 'Welcome back',
    'admin.reports': 'Reports',
    'admin.users': 'Users',
    'admin.locations': 'Locations',
    'admin.shifts': 'Shifts',
    'admin.makeupRequests': 'Make-up Requests',
    
    // Admin Reports
    'admin.filterExport': 'Filter & Export',
    'admin.filterAttendanceData': 'Filter attendance data and export reports',
    'admin.startDate': 'Start Date',
    'admin.endDate': 'End Date',
    'admin.employee': 'Employee',
    'admin.allEmployees': 'All employees',
    'admin.allStatuses': 'All statuses',
    'admin.allMethods': 'All methods',
    'admin.regular': 'Regular',
    'admin.makeup': 'Make-up',
    'admin.reset': 'Reset',
    'admin.csv': 'CSV',
    'admin.attendanceReport': 'Attendance Report',
    'admin.recordsFound': 'records found',
    'admin.date': 'Date',
    'admin.exportSuccess': 'Report exported successfully!',
    
    // Admin User Management
    'admin.userManagement': 'User Management',
    'admin.manageUsers': 'Manage user accounts and roles',
    'admin.admin': 'Admin',
    'admin.user': 'User',
    
    // Admin Location Management
    'admin.locationManagement': 'Location Management',
    'admin.manageValidLocations': 'Manage valid attendance locations with GPS coordinates',
    'admin.addLocation': 'Add Location',
    'admin.editLocation': 'Edit Location',
    'admin.addNewLocation': 'Add New Location',
    'admin.setupValidLocation': 'Set up a valid attendance location with GPS coordinates and radius.',
    'admin.locationName': 'Location Name',
    'admin.locationNamePlaceholder': 'e.g., Main Office',
    'admin.latitude': 'Latitude',
    'admin.longitude': 'Longitude',
    'admin.radiusMeters': 'Radius (meters)',
    'admin.active': 'Active',
    'admin.coordinates': 'Coordinates',
    'admin.status': 'Status',
    'admin.inactive': 'Inactive',
    'admin.deleteLocationConfirm': 'Are you sure you want to delete this location?',
    'admin.locationCreated': 'Location created successfully!',
    'admin.locationUpdated': 'Location updated successfully!',
    'admin.locationDeleted': 'Location deleted successfully!',
    
    // Admin Shift Management
    'admin.shiftManagement': 'Shift Management',
    'admin.manageWorkShifts': 'Manage work shifts and their time schedules',
    'admin.addShift': 'Add Shift',
    'admin.editShift': 'Edit Shift',
    'admin.addNewShift': 'Add New Shift',
    'admin.setupWorkShift': 'Set up work shift times for attendance tracking.',
    'admin.shiftName': 'Shift Name',
    'admin.shiftNamePlaceholder': 'e.g., Morning Shift',
    'admin.startTime': 'Start Time',
    'admin.endTime': 'End Time',
    'admin.duration': 'Duration',
    'admin.hours': 'hours',
    'admin.dayType': 'Day Type',
    'admin.selectDayType': 'Select Day Type',
    'admin.dayType.weekday': 'Weekday',
    'admin.dayType.weekend': 'Weekend',
    'admin.dayType.holiday': 'Holiday',
    'admin.dayType.all': 'All Days',
    'admin.deleteShiftConfirm': 'Are you sure you want to delete this shift?',
    'admin.shiftCreated': 'Shift created successfully!',
    'admin.shiftUpdated': 'Shift updated successfully!',
    'admin.shiftDeleted': 'Shift deleted successfully!',
    
    // Admin Makeup Requests
    'admin.makeupRequestsTitle': 'Make-up Requests',
    'admin.reviewProcessRequests': 'Review and process employee make-up attendance requests',
    'admin.reason': 'Reason',
    'admin.submitted': 'Submitted',
    'admin.reviewMakeupRequest': 'Review Make-up Request',
    'admin.reviewDetails': 'Review the details and approve or reject this make-up request.',
    'admin.dateOfMissed': 'Date of Missed Attendance',
    'admin.supportingDocument': 'Supporting Document',
    'admin.viewDocument': 'View Document',
    'admin.adminNotes': 'Admin Notes',
    'admin.addNotesDecision': 'Add notes about your decision...',
    'admin.reject': 'Reject',
    'admin.approve': 'Approve',
    'admin.makeupRequestApproved': 'Make-up request approved and attendance record created!',
    'admin.makeupRequestRejected': 'Make-up request rejected.',
    
    // Status
    'status.HADIR': 'PRESENT',
    'status.TERLAMBAT': 'LATE',
    'status.MAKE_UP': 'MAKE UP',
    'status.pending': 'PENDING',
    'status.approved': 'APPROVED',
    'status.rejected': 'REJECTED',
    
    // General
    'general.success': 'Success',
    'general.error': 'Error',
    'general.loading': 'Loading...',
    'general.save': 'Save',
    'general.cancel': 'Cancel',
    'general.delete': 'Delete',
    'general.edit': 'Edit',
    'general.add': 'Add',
    'general.view': 'View',
    'general.actions': 'Actions',
    'general.name': 'Name',
    'general.created': 'Created',
    'general.role': 'Role',
    'general.create': 'Create',
    'general.update': 'Update',
    'general.time': 'Time',
    'general.location': 'Location',
    'general.method': 'Method',
    
    // Attendance
    'attendance.history': 'Attendance History',
    'attendance.status': 'Status',
    'attendance.method': 'Method',
    'attendance.location': 'Location',
    'attendance.reason': 'Reason',
    'attendance.noRecords': 'No attendance records found',
    
    // Notifications
    'notification.locationError': 'Location Error',
    'notification.notValidLocation': 'You are not at a valid location for attendance',
    'notification.attendanceSuccess': 'Attendance successful! Status',
    'notification.roleUpdated': 'User role updated successfully!',
    
    // Language
    'language.indonesian': 'Bahasa Indonesia',
    'language.english': 'English'
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'id';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};