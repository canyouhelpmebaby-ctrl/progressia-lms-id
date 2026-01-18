import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { GraduationCap, BookOpen, TrendingUp, Award } from 'lucide-react';
import heroImage from '@/assets/hero-education.jpg';
import iconLearning from '@/assets/icon-learning.png';
import iconProgress from '@/assets/icon-progress.png';
import iconCourses from '@/assets/icon-courses.png';
import logoProgressia from '@/assets/logo-progressia.png';

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/95 backdrop-blur sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={logoProgressia} alt="Progressia Logo" className="h-10 w-10" />
              <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Progressia
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/auth">
                <Button>Masuk</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Tingkatkan Pembelajaran Anda dengan{' '}
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  Progressia
                </span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Platform manajemen pembelajaran modern yang membantu Anda melacak progres,
                mengelola kursus, dan mencapai tujuan pendidikan dengan lebih efektif.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/auth">
                  <Button size="lg" className="text-lg">
                    Mulai Gratis
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button size="lg" variant="outline" className="text-lg">
                    Pelajari Lebih Lanjut
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src={heroImage}
                  alt="Students learning"
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-primary opacity-20" />
              </div>
            </div>
          </div>
        </div>

        {/* Decorative gradient */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-hero opacity-10 blur-3xl rounded-full -z-10" />
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-stats-bg">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: 'Pengguna Aktif', value: '1000+' },
              { label: 'Kursus Tersedia', value: '50+' },
              { label: 'Tingkat Kepuasan', value: '95%' },
              { label: 'Sertifikat Diberikan', value: '500+' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Semua yang Anda Butuhkan untuk Sukses
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Fitur lengkap untuk mendukung perjalanan pembelajaran Anda
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="shadow-md hover:shadow-lg transition-shadow bg-gradient-card border-none">
              <CardContent className="pt-6">
                <div className="flex justify-center mb-6">
                  <img src={iconLearning} alt="Learning" className="h-20 w-20" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-center">
                  Pembelajaran Terstruktur
                </h3>
                <p className="text-muted-foreground text-center">
                  Akses kursus berkualitas dengan modul pembelajaran yang terorganisir
                  dan mudah diikuti.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-md hover:shadow-lg transition-shadow bg-gradient-card border-none">
              <CardContent className="pt-6">
                <div className="flex justify-center mb-6">
                  <img src={iconProgress} alt="Progress" className="h-20 w-20" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-center">
                  Pelacakan Progres
                </h3>
                <p className="text-muted-foreground text-center">
                  Monitor perkembangan belajar Anda secara real-time dengan visualisasi
                  yang jelas dan intuitif.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-md hover:shadow-lg transition-shadow bg-gradient-card border-none">
              <CardContent className="pt-6">
                <div className="flex justify-center mb-6">
                  <img src={iconCourses} alt="Courses" className="h-20 w-20" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-center">
                  Notifikasi Pintar
                </h3>
                <p className="text-muted-foreground text-center">
                  Dapatkan pengingat pembelajaran dan update progres langsung ke
                  dashboard Anda.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center text-primary-foreground">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              Siap Memulai Perjalanan Belajar Anda?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Bergabunglah dengan ribuan pelajar yang telah meningkatkan keterampilan
              mereka bersama Progressia
            </p>
            <Link to="/auth">
              <Button
                size="lg"
                variant="secondary"
                className="text-lg px-8 shadow-lg hover:shadow-xl transition-shadow"
              >
                Daftar Sekarang - Gratis!
              </Button>
            </Link>
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-hero opacity-30" />
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center text-muted-foreground">
            <div className="flex items-center justify-center gap-2 mb-4">
              <img src={logoProgressia} alt="Progressia Logo" className="h-8 w-8" />
              <span className="font-bold text-lg bg-gradient-primary bg-clip-text text-transparent">
                Progressia
              </span>
            </div>
            <p>&copy; 2025 Progressia. Platform Pembelajaran Modern.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}