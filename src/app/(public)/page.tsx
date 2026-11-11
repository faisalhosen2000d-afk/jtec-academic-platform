import React from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  GraduationCap, 
  ArrowRight, 
  Sparkles, 
  Compass, 
  Cpu, 
  Layers, 
  Grid, 
  Droplets, 
  Scissors, 
  BookOpen, 
  ShieldAlert, 
  Calculator, 
  Download, 
  Lock, 
  UserPlus 
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface NoticeItem {
  id: string;
  title: string;
  content?: string | null;
  created_at?: string | null;
}

export default async function JtecLandingPage() {
  let notices: NoticeItem[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("notices")
      .select("id, title, content, created_at")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(3);
    notices = data || [];
  } catch {
    notices = [];
  }

  return (
    <div className="min-h-screen bg-[#060A12] text-slate-200 antialiased font-sans selection:bg-red-700 selection:text-white">
      {/* Announcement Bar */}
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-red-950 py-2 px-4 border-b border-red-900/40 text-xs font-medium text-slate-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500 text-slate-950 uppercase tracking-wider animate-pulse">
              Live
            </span>
            <span>Official Academic Platform & Examination Portal Active</span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-slate-400">
            <span>Academic Year: 2024–2025</span>
            <span className="text-slate-600">•</span>
            <a href="#notices" className="hover:text-amber-400 transition-colors">
              Campus Circulars
            </a>
          </div>
        </div>
      </div>

      {/* Sticky Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#060A12]/85 border-b border-slate-800/80 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3.5 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-600 via-red-900 to-amber-600 p-0.5 shadow-lg group-hover:scale-105 transition-transform duration-300">
              <div className="w-full h-full bg-[#070B14] rounded-[10px] flex items-center justify-center font-serif font-black text-amber-400 text-lg tracking-wider">
                J
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-extrabold text-lg text-white tracking-wider group-hover:text-amber-400 transition-colors">
                JTEC
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-widest text-slate-400">
                Academic Platform
              </span>
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#overview" className="hover:text-amber-400 transition-colors">Overview</a>
            <a href="#departments" className="hover:text-amber-400 transition-colors">Departments</a>
            <a href="#features" className="hover:text-amber-400 transition-colors">Academic Hub</a>
            <a href="#notices" className="hover:text-amber-400 transition-colors">Notices</a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="relative group inline-flex items-center justify-center p-0.5 rounded-xl font-medium text-sm transition-all duration-300 hover:scale-105"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 rounded-xl blur-sm opacity-70 group-hover:opacity-100 transition duration-300"></span>
              <span className="relative px-5 py-2.5 rounded-[10px] bg-[#0C1425] text-white flex items-center gap-2 border border-amber-500/30 group-hover:bg-[#101B33]">
                <GraduationCap className="w-4 h-4 text-amber-400" />
                <span className="font-semibold tracking-wide">Student Portal</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="overview" className="relative pt-10 pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-semibold mb-6 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Official Institutional Gateway & Academic Operating System</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-black tracking-tight text-white mb-6 leading-tight">
              JHENAIDAH TEXTILE<br />
              <span className="bg-gradient-to-r from-white via-amber-200 to-amber-500 bg-clip-text text-transparent">
                ENGINEERING COLLEGE
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed font-light">
              Weaving innovation with technical mastery. Empowering the next generation of textile engineers through specialized laboratories, dynamic academics, and modern digital governance.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <a
                href="#departments"
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-red-900 to-red-600 text-white font-semibold text-sm shadow-xl shadow-red-950/50 hover:shadow-red-900/80 hover:scale-[1.02] transition-all flex items-center gap-2 border border-red-500/30"
              >
                <span>Explore 4 Engineering Disciplines</span>
                <Compass className="w-4 h-4" />
              </a>
              <a
                href="#features"
                className="px-6 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 font-semibold text-sm border border-slate-700/80 hover:border-slate-500 transition-all flex items-center gap-2"
              >
                <span>Platform Features</span>
                <Cpu className="w-4 h-4 text-amber-400" />
              </a>
            </div>
          </div>

          {/* Cinematic Campus Gate Card */}
          <div className="relative max-w-5xl mx-auto rounded-3xl p-2 bg-gradient-to-b from-slate-700/40 via-slate-800/40 to-slate-900/80 shadow-2xl">
            <div className="relative rounded-[22px] overflow-hidden bg-slate-950 border border-slate-800/80 aspect-[16/9]">
              <Image
                src="/campus-gate-night.webp"
                alt="JTEC Campus Main Gate at Night"
                width={1280}
                height={720}
                priority
                className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-1000 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#060A12] via-transparent to-transparent opacity-90"></div>

              <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 p-5 rounded-2xl backdrop-blur-md bg-slate-950/70 border border-white/10 shadow-xl">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Main Campus Landmark</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">Main Entrance & Academic Complex</h3>
                  <p className="text-xs text-slate-400">Jhenaidah Textile Engineering College, Jhenaidah-7300, Bangladesh</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1.5 rounded-lg bg-red-950/60 border border-red-500/30 text-xs font-semibold text-red-300">
                    Established Campus
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-amber-950/60 border border-amber-500/30 text-xs font-semibold text-amber-300">
                    B.Sc. in Textile Engineering
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Ribbon */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto mt-10">
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-sm text-center hover:border-amber-500/40 transition-colors">
              <div className="text-3xl font-black text-amber-400 font-serif">4</div>
              <div className="text-xs font-medium text-slate-400 mt-1">Specialized Departments</div>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-sm text-center hover:border-red-500/40 transition-colors">
              <div className="text-3xl font-black text-white font-serif">166</div>
              <div className="text-xs font-medium text-slate-400 mt-1">Total Degree Credits</div>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-sm text-center hover:border-amber-500/40 transition-colors">
              <div className="text-3xl font-black text-amber-400 font-serif">8+</div>
              <div className="text-xs font-medium text-slate-400 mt-1">Batches of Heritage</div>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-sm text-center hover:border-red-500/40 transition-colors">
              <div className="text-3xl font-black text-white font-serif">100%</div>
              <div className="text-xs font-medium text-slate-400 mt-1">Automated Governance</div>
            </div>
          </div>
        </div>
      </section>

      {/* Departments Section */}
      <section id="departments" className="py-24 relative bg-[#080D18] border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Core Engineering Faculties</span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white mt-2">Specialized Textile Departments</h2>
            <p className="text-slate-400 text-sm mt-3">Offering four distinct, high-impact disciplines covering the complete value chain from molecular fiber synthesis to international retail supply chains.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Yarn */}
            <div className="group relative rounded-2xl p-7 bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 transition-all duration-300 hover:-translate-y-1 shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Layers className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">YE • 166 Credits</span>
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">Yarn Engineering</h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Specializing in natural and synthetic fiber science, modern spinning mechanics, polymer processing, and precision yarn manufacturing operations.
              </p>
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap gap-2 text-xs text-slate-400">
                <span className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800">Spinning Lab</span>
                <span className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800">Fiber Testing</span>
                <span className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800">Yarn Production</span>
              </div>
            </div>

            {/* Fabric */}
            <div className="group relative rounded-2xl p-7 bg-slate-900/90 border border-slate-800 hover:border-red-500/50 transition-all duration-300 hover:-translate-y-1 shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                  <Grid className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">FE • 166 Credits</span>
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-red-400 transition-colors">Fabric Engineering</h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Advancing woven and knitted fabric architectures, weaving mechanics, technical textiles, non-wovens, and computational fabric simulation.
              </p>
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap gap-2 text-xs text-slate-400">
                <span className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800">Weaving Shed</span>
                <span className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800">Knitting Lab</span>
                <span className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800">Fabric CAD</span>
              </div>
            </div>

            {/* Wet Process */}
            <div className="group relative rounded-2xl p-7 bg-slate-900/90 border border-slate-800 hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-1 shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Droplets className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">WPE • 166 Credits</span>
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">Wet Process Engineering</h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Focusing on coloration chemistry, industrial dyeing, rotary and digital printing, functional finishing, and sustainable water effluent management.
              </p>
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap gap-2 text-xs text-slate-400">
                <span className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800">Coloration Lab</span>
                <span className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800">Printing Section</span>
                <span className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800">Eco-Finishing</span>
              </div>
            </div>

            {/* Apparel */}
            <div className="group relative rounded-2xl p-7 bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 transition-all duration-300 hover:-translate-y-1 shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Scissors className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">AE • 166 Credits</span>
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">Apparel Engineering</h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Engineering garment manufacturing systems, pattern design, industrial work study, international apparel merchandising, and global supply chains.
              </p>
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap gap-2 text-xs text-slate-400">
                <span className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800">Sewing Shed</span>
                <span className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800">CAD Pattern Lab</span>
                <span className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800">Merchandising</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Hub */}
      <section id="features" className="py-24 relative border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-red-500">Smart Governance</span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white mt-2">Campus Operating System</h2>
            <p className="text-slate-400 text-sm mt-3">Designed and built from the ground up to replace outdated paperwork with real-time academic workflows for students, faculty, and administration.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-8 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition-all shadow-md">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-6">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Central Academic Repository</h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Term-by-term lecture notes, approved presentations, and past exam questions cataloged by department, level, and course code.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-red-500/40 transition-all shadow-md">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-6">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Academic Standing Engine</h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Real-time retake risk tracking, automated term promotion alerts, and smart air-drop history tracking to protect academic careers.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition-all shadow-md">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6">
                <Calculator className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Curriculum CGPA Planner</h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Interactive credit-weighted simulator mapped to all 166 credits across 8 semesters for targeted GPA forecasting.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Notices Section */}
      <section id="notices" className="py-24 relative bg-[#080D18] border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Official Board</span>
              <h2 className="text-3xl font-serif font-bold text-white mt-2">Latest Notices & Circulars</h2>
            </div>
            <Link href="/login" className="mt-4 md:mt-0 text-sm font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors">
              <span>View All in Student Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-4">
            {notices.length > 0 ? (
              notices.map((n) => (
                <div key={n.id} className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all">
                  <div className="flex items-start gap-4">
                    <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-center min-w-[70px]">
                      <div className="text-xs font-bold uppercase">Notice</div>
                      <div className="text-lg font-black font-serif">Doc</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950/40 text-red-300 border border-red-500/30">
                          Official Notice
                        </span>
                        <span className="text-xs text-slate-500">
                          {n.created_at ? new Date(n.created_at).toLocaleDateString() : "Recent"}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-white hover:text-amber-400 transition-colors">
                        {n.title}
                      </h4>
                      {n.content && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{n.content}</p>
                      )}
                    </div>
                  </div>
                  <Link
                    href="/login"
                    className="px-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-600 transition-all flex items-center justify-center gap-2 self-start md:self-center"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>View in Portal</span>
                  </Link>
                </div>
              ))
            ) : (
              <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-center min-w-[70px]">
                    <div className="text-xs font-bold uppercase">Nov</div>
                    <div className="text-xl font-black font-serif">10</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950/40 text-red-300 border border-red-500/30">
                        Official Notice
                      </span>
                      <span className="text-xs text-slate-500">Official Bulletin</span>
                    </div>
                    <h4 className="text-base font-bold text-white hover:text-amber-400 transition-colors">
                      Publication of Semester Final Results & Updated Academic Transcripts
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">Official transcripts and rank cards have been published to the student portal.</p>
                  </div>
                </div>
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-600 transition-all flex items-center justify-center gap-2 self-start md:self-center"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Portal Access</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA / Portal Banner */}
      <section id="portal" className="py-20 relative bg-gradient-to-b from-[#080D18] to-[#060A12] border-t border-slate-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl p-10 md:p-14 bg-gradient-to-br from-slate-900 via-slate-950 to-red-950/30 border border-red-900/40 overflow-hidden shadow-2xl text-center">
            <div className="relative z-10 max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-amber-500 p-0.5 mx-auto mb-6 shadow-xl">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-amber-400">
                  <Lock className="w-7 h-7" />
                </div>
              </div>

              <h2 className="text-2xl sm:text-4xl font-serif font-black text-white">Access the Student Portal</h2>
              <p className="text-slate-400 text-sm mt-3 leading-relaxed">
                Sign in with your student account to access your official term transcript, browse approved department materials, review bookmarks, and view verified merit rankings.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-red-900 to-red-600 text-white font-bold text-sm shadow-xl shadow-red-950/60 hover:scale-105 transition-all flex items-center justify-center gap-2 border border-red-500/40"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Sign In to Student Portal</span>
                </Link>
                <Link
                  href="/register"
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-sm border border-slate-700 transition-all flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4 text-amber-400" />
                  <span>Create Account with Code</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#04070D] border-t border-slate-900 py-16 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-red-700 p-0.5 flex items-center justify-center font-serif font-black text-white text-base">
                  J
                </div>
                <span className="font-serif font-bold text-base text-white tracking-wider">
                  JHENAIDAH TEXTILE ENGINEERING COLLEGE
                </span>
              </div>
              <p className="text-slate-400 leading-relaxed max-w-md text-xs">
                A specialized engineering institution dedicated to advanced textile engineering education, laboratory research, and technical leadership.
              </p>
              <div className="mt-4 text-slate-500 text-[11px]">
                Campus: Jhenaidah-7300, Khulna Division, Bangladesh
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Engineering Departments</h4>
              <ul className="space-y-2.5">
                <li><a href="#departments" className="hover:text-amber-400 transition-colors">Yarn Engineering (YE)</a></li>
                <li><a href="#departments" className="hover:text-amber-400 transition-colors">Fabric Engineering (FE)</a></li>
                <li><a href="#departments" className="hover:text-amber-400 transition-colors">Wet Process Engineering (WPE)</a></li>
                <li><a href="#departments" className="hover:text-amber-400 transition-colors">Apparel Engineering (AE)</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Quick Navigation</h4>
              <ul className="space-y-2.5">
                <li><Link href="/login" className="hover:text-amber-400 transition-colors">Student Portal Login</Link></li>
                <li><Link href="/register" className="hover:text-amber-400 transition-colors">Registration with Code</Link></li>
                <li><a href="#notices" className="hover:text-amber-400 transition-colors">Official Notice Board</a></li>
                <li><a href="#features" className="hover:text-amber-400 transition-colors">Academic Hub</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-600">
            <div>&copy; 2026 Jhenaidah Textile Engineering College. All rights reserved.</div>
            <div className="flex items-center gap-6 text-slate-500">
              <span>Academic Operating System v2.0</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
