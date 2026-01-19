import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CertificateData {
  userName: string;
  courseName: string;
  completionDate: string;
  certificateNumber: string;
  templateUrl: string;
}

// Generate SVG-based certificate
function generateCertificateSVG(data: CertificateData): string {
  const formattedDate = new Date(data.completionDate).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="850" viewBox="0 0 1200 850">
      <defs>
        <linearGradient id="borderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#C9A227;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#F4D03F;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#C9A227;stop-opacity:1" />
        </linearGradient>
        <pattern id="pattern" width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="20" cy="20" r="1" fill="#E8E8E8"/>
        </pattern>
      </defs>
      
      <!-- Background -->
      <rect width="1200" height="850" fill="#FAFAFA"/>
      <rect width="1200" height="850" fill="url(#pattern)"/>
      
      <!-- Outer Border -->
      <rect x="20" y="20" width="1160" height="810" fill="none" stroke="url(#borderGradient)" stroke-width="3"/>
      <rect x="30" y="30" width="1140" height="790" fill="none" stroke="url(#borderGradient)" stroke-width="1"/>
      
      <!-- Corner Ornaments -->
      <path d="M50,50 L100,50 L100,55 L55,55 L55,100 L50,100 Z" fill="#C9A227"/>
      <path d="M1150,50 L1100,50 L1100,55 L1145,55 L1145,100 L1150,100 Z" fill="#C9A227"/>
      <path d="M50,800 L100,800 L100,795 L55,795 L55,750 L50,750 Z" fill="#C9A227"/>
      <path d="M1150,800 L1100,800 L1100,795 L1145,795 L1145,750 L1150,750 Z" fill="#C9A227"/>
      
      <!-- Header -->
      <text x="600" y="120" font-family="Georgia, serif" font-size="28" fill="#666666" text-anchor="middle" letter-spacing="8">SERTIFIKAT</text>
      <text x="600" y="170" font-family="Georgia, serif" font-size="42" fill="#1a1a1a" text-anchor="middle" font-weight="bold">PENYELESAIAN KURSUS</text>
      
      <!-- Decorative Line -->
      <line x1="400" y1="200" x2="800" y2="200" stroke="#C9A227" stroke-width="2"/>
      <circle cx="600" cy="200" r="5" fill="#C9A227"/>
      
      <!-- Certificate Text -->
      <text x="600" y="280" font-family="Georgia, serif" font-size="20" fill="#666666" text-anchor="middle">Dengan ini menyatakan bahwa</text>
      
      <!-- User Name -->
      <text x="600" y="360" font-family="Georgia, serif" font-size="48" fill="#1a1a1a" text-anchor="middle" font-weight="bold" font-style="italic">${escapeXml(data.userName)}</text>
      <line x1="300" y1="380" x2="900" y2="380" stroke="#C9A227" stroke-width="1"/>
      
      <!-- Course Completion Text -->
      <text x="600" y="450" font-family="Georgia, serif" font-size="20" fill="#666666" text-anchor="middle">telah berhasil menyelesaikan kursus</text>
      
      <!-- Course Name -->
      <text x="600" y="520" font-family="Georgia, serif" font-size="36" fill="#2563EB" text-anchor="middle" font-weight="bold">${escapeXml(data.courseName)}</text>
      
      <!-- Completion Date -->
      <text x="600" y="600" font-family="Georgia, serif" font-size="18" fill="#666666" text-anchor="middle">pada tanggal ${formattedDate}</text>
      
      <!-- Certificate Number -->
      <text x="600" y="750" font-family="Courier, monospace" font-size="14" fill="#999999" text-anchor="middle">No. Sertifikat: ${data.certificateNumber}</text>
      
      <!-- Seal/Badge -->
      <circle cx="600" cy="680" r="40" fill="none" stroke="#C9A227" stroke-width="2"/>
      <circle cx="600" cy="680" r="35" fill="none" stroke="#C9A227" stroke-width="1"/>
      <text x="600" y="675" font-family="Georgia, serif" font-size="12" fill="#C9A227" text-anchor="middle">RESMI</text>
      <text x="600" y="690" font-family="Georgia, serif" font-size="10" fill="#C9A227" text-anchor="middle">TERVERIFIKASI</text>
    </svg>
  `;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid token');
    }

    const { courseId } = await req.json();

    if (!courseId) {
      throw new Error('Course ID is required');
    }

    // Check if course is completed
    const { data: completionCheck, error: completionError } = await supabase
      .rpc('check_course_completion', { p_user_id: user.id, p_course_id: courseId });

    if (completionError) {
      throw new Error('Failed to check course completion: ' + completionError.message);
    }

    if (!completionCheck) {
      throw new Error('Course not completed yet');
    }

    // Get or create certificate
    let certificate;
    const { data: existingCert } = await supabase
      .from('user_certificates')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single();

    if (existingCert) {
      certificate = existingCert;
    } else {
      // Issue new certificate
      const { data: newCertId, error: issueError } = await supabase
        .rpc('issue_certificate', { p_user_id: user.id, p_course_id: courseId });

      if (issueError) {
        throw new Error('Failed to issue certificate: ' + issueError.message);
      }

      const { data: newCert, error: fetchError } = await supabase
        .from('user_certificates')
        .select('*')
        .eq('id', newCertId)
        .single();

      if (fetchError) {
        throw new Error('Failed to fetch certificate: ' + fetchError.message);
      }

      certificate = newCert;
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    if (profileError) {
      throw new Error('Failed to get user profile: ' + profileError.message);
    }

    // Get course details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('title, certificate_template_url')
      .eq('id', courseId)
      .single();

    if (courseError) {
      throw new Error('Failed to get course: ' + courseError.message);
    }

    // Generate certificate SVG
    const certificateData: CertificateData = {
      userName: profile.full_name,
      courseName: course.title,
      completionDate: certificate.issued_at,
      certificateNumber: certificate.certificate_number,
      templateUrl: course.certificate_template_url || '',
    };

    const svgContent = generateCertificateSVG(certificateData);

    // Return SVG content for preview
    return new Response(
      JSON.stringify({
        success: true,
        certificate: {
          id: certificate.id,
          certificateNumber: certificate.certificate_number,
          issuedAt: certificate.issued_at,
          userName: profile.full_name,
          courseName: course.title,
        },
        svg: svgContent,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Certificate generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
