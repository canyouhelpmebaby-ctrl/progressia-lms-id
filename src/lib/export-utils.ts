import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface UserExportData {
  profile: any;
  stats: {
    totalCourses: number;
    completedCourses: number;
    activeCourses: number;
    totalLearningMinutes: number;
    totalLearningHours: string;
    totalSessions: number;
    totalRecords: number;
    totalPoints: number;
    totalRewards: number;
    activeGoals: number;
    completedGoals: number;
  };
}

export const exportUsersToCSV = (usersData: UserExportData[]) => {
  // Define CSV headers
  const headers = [
    'Nama Lengkap',
    'Email',
    'Peran',
    'Tanggal Bergabung',
    'Total Kursus',
    'Kursus Selesai',
    'Kursus Aktif',
    'Total Waktu Belajar (Menit)',
    'Total Waktu Belajar (Jam)',
    'Total Sesi Belajar',
    'Total Catatan Belajar',
    'Total Poin',
    'Total Rewards',
    'Target Aktif',
    'Target Selesai',
  ];

  // Convert data to CSV rows
  const rows = usersData.map((userData) => {
    const { profile, stats } = userData;
    const isAdmin = profile.user_roles?.some((r: any) => r.role === 'admin');

    return [
      profile.full_name || '',
      profile.email || '',
      isAdmin ? 'Admin' : 'Student',
      format(new Date(profile.created_at), 'dd/MM/yyyy', { locale: id }),
      stats.totalCourses,
      stats.completedCourses,
      stats.activeCourses,
      stats.totalLearningMinutes,
      stats.totalLearningHours,
      stats.totalSessions,
      stats.totalRecords,
      stats.totalPoints,
      stats.totalRewards,
      stats.activeGoals,
      stats.completedGoals,
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          // Escape cells that contain commas or quotes
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        })
        .join(',')
    ),
  ].join('\n');

  // Create blob and download
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
  link.setAttribute('href', url);
  link.setAttribute('download', `data_pengguna_${timestamp}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportUserDetailToCSV = (
  profile: any,
  courseProgress: any[],
  sessions: any[],
  records: any[],
  rewards: any[],
  goals: any[]
) => {
  // Create detailed export with multiple sections
  const sections: string[] = [];

  // User Info Section
  sections.push('=== INFORMASI PENGGUNA ===');
  sections.push(`Nama,${profile.full_name}`);
  sections.push(`Email,${profile.email}`);
  sections.push(`Tanggal Bergabung,${format(new Date(profile.created_at), 'dd/MM/yyyy HH:mm', { locale: id })}`);
  sections.push('');

  // Course Progress Section
  sections.push('=== PROGRESS KURSUS ===');
  sections.push('Nama Kursus,Status,Modul Selesai,Total Modul,Progress (%)');
  courseProgress.forEach((cp) => {
    const percentage = cp.courses?.total_modules
      ? ((cp.completed_modules / cp.courses.total_modules) * 100).toFixed(1)
      : '0';
    sections.push(
      `"${cp.courses?.title || 'N/A'}",${cp.status},${cp.completed_modules},${cp.courses?.total_modules || 0},${percentage}%`
    );
  });
  sections.push('');

  // Learning Sessions Section
  sections.push('=== SESI BELAJAR ===');
  sections.push('Tanggal,Kursus,Tipe,Durasi (Menit),Catatan');
  sessions.forEach((session) => {
    sections.push(
      `${format(new Date(session.session_date), 'dd/MM/yyyy', { locale: id })},"${session.courses?.title || 'N/A'}",${session.session_type},${session.duration_minutes},"${session.notes || ''}"`
    );
  });
  sections.push('');

  // Learning Records Section
  sections.push('=== CATATAN BELAJAR ===');
  sections.push('Tanggal,Kursus,Tipe Aktivitas,Deskripsi,Durasi (Menit)');
  records.forEach((record) => {
    sections.push(
      `${format(new Date(record.record_date), 'dd/MM/yyyy', { locale: id })},"${record.courses?.title || 'N/A'}",${record.activity_type},"${record.activity_description || ''}",${record.duration_minutes || 0}`
    );
  });
  sections.push('');

  // Goals Section
  sections.push('=== TARGET BELAJAR ===');
  sections.push('Judul,Deskripsi,Tipe,Status,Progress,Target,Tanggal Mulai,Tanggal Selesai');
  goals.forEach((goal) => {
    sections.push(
      `"${goal.title}","${goal.description || ''}",${goal.goal_type},${goal.status},${goal.current_value},${goal.target_value},${format(new Date(goal.start_date), 'dd/MM/yyyy', { locale: id })},${format(new Date(goal.end_date), 'dd/MM/yyyy', { locale: id })}`
    );
  });
  sections.push('');

  // Rewards Section
  sections.push('=== REWARDS & BADGE ===');
  sections.push('Badge,Tipe,Poin,Deskripsi,Tanggal Diraih');
  rewards.forEach((reward) => {
    sections.push(
      `"${reward.badge_name}",${reward.badge_type},${reward.points},"${reward.description || ''}",${format(new Date(reward.earned_at), 'dd/MM/yyyy HH:mm', { locale: id })}`
    );
  });

  const csvContent = sections.join('\n');

  // Create blob and download
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
  const filename = `detail_${profile.full_name.replace(/\s+/g, '_')}_${timestamp}.csv`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
