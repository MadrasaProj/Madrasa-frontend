import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguageStore } from "@/store/language";
import { elections, Election, students } from "@/mock-data";
import {
  Vote, Play, Square, CheckCircle2,
  BarChart3, X, ChevronRight,
  Clock, UserCheck, RotateCcw, Eye
} from "lucide-react";

// Simulated: logged-in teacher T001
const MY_TEACHER_ID = "T001";
const MY_CLASSES = ["Class 4", "Class 3"];

// Runtime state for teacher-opened sessions
interface SessionVote { studentId: string; studentName: string; candidateId: string; }
interface LiveSession {
  electionId: string;
  open: boolean;
  votes: SessionVote[];
  closedAt?: string;
}

export default function TeacherElectionsPage() {
  const { lang } = useLanguageStore();

  // Sessions managed by this teacher
  const [sessions, setSessions] = useState<Record<string, LiveSession>>({});

  // Which election is open in teacher view
  const [managingEl, setManagingEl] = useState<Election | null>(null);

  // Student voting modal (simulates a student picking their vote)
  const [votingStudent, setVotingStudent] = useState<{ id: string; name: string } | null>(null);
  const [studentPick, setStudentPick] = useState<string | null>(null);

  // Results modal
  const [resultsEl, setResultsEl] = useState<Election | null>(null);

  // Filter to teacher's elections (class_vote type, teacher's classes)
  const myElections = elections.filter(
    (e) => e.type === "class_vote" && MY_CLASSES.includes(e.class as string)
  );

  const draftReady = myElections.filter((e) => e.status === "draft");
  const activeOwn = myElections.filter((e) => e.status === "active" && e.teacherId === MY_TEACHER_ID);
  const pastOwn = myElections.filter((e) =>
    (e.status === "closed" || e.status === "results_published") && e.teacherId === MY_TEACHER_ID
  );

  const getSession = (elId: string): LiveSession =>
    sessions[elId] ?? { electionId: elId, open: false, votes: [] };

  const openSession = (el: Election) => {
    setSessions((prev) => ({
      ...prev,
      [el.id]: { electionId: el.id, open: true, votes: [] },
    }));
    setManagingEl(el);
  };

  const closeSession = (elId: string) => {
    setSessions((prev) => ({
      ...prev,
      [elId]: { ...prev[elId], open: false, closedAt: new Date().toISOString() },
    }));
    setManagingEl(null);
  };

  const submitStudentVote = () => {
    if (!managingEl || !votingStudent || !studentPick) return;
    setSessions((prev) => {
      const sess = prev[managingEl.id] ?? { electionId: managingEl.id, open: true, votes: [] };
      const alreadyVoted = sess.votes.some((v) => v.studentId === votingStudent.id);
      if (alreadyVoted) return prev;
      return {
        ...prev,
        [managingEl.id]: {
          ...sess,
          votes: [...sess.votes, {
            studentId: votingStudent.id,
            studentName: votingStudent.name,
            candidateId: studentPick,
          }],
        },
      };
    });
    setVotingStudent(null);
    setStudentPick(null);
  };

  const getStudentsForElection = (el: Election) =>
    students.filter((s) => s.class === el.class);

  const getVoteCountForCandidate = (elId: string, candidateId: string, el: Election): number => {
    const runtime = sessions[elId]?.votes.filter((v) => v.candidateId === candidateId).length ?? 0;
    const seeded = el.classVotes?.filter((v) => v.candidateId === candidateId).length ?? 0;
    return runtime + seeded;
  };

  const hasStudentVoted = (elId: string, studentId: string, el: Election): boolean => {
    const runtime = sessions[elId]?.votes.some((v) => v.studentId === studentId) ?? false;
    const seeded = el.classVotes?.some((v) => v.studentId === studentId) ?? false;
    return runtime || seeded;
  };

  const totalVotesForElection = (elId: string, el: Election): number => {
    const runtime = sessions[elId]?.votes.length ?? 0;
    const seeded = el.classVotes?.length ?? 0;
    return runtime + seeded;
  };

  const barColors = ["bg-emerald-500", "bg-teal-500", "bg-amber-500", "bg-blue-500", "bg-purple-500"];

  return (
    <DashboardLayout>
      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 lg:mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-100 rounded-2xl flex items-center justify-center">
            <Vote className="w-5 h-5 text-teal-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {lang === "ml" ? "ക്ലാസ് തിരഞ്ഞെടുപ്പ്" : "Class Elections"}
            </h1>
            <p className="text-xs text-gray-500">
              {lang === "ml"
                ? "വോട്ടിംഗ് സെഷൻ തുറക്കുക, വിദ്യാർത്ഥി വോട്ടുകൾ രേഖപ്പെടുത്തുക"
                : "Open sessions, record student votes & publish results"}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── My Active Sessions ── */}
      {activeOwn.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
            {lang === "ml" ? "⚡ നിങ്ങളുടെ സജീവ സെഷനുകൾ" : "⚡ Your Active Sessions"}
          </p>
          {activeOwn.map((el) => {
            const sess = getSession(el.id);
            const elStudents = getStudentsForElection(el);
            const totalVotes = totalVotesForElection(el.id, el);
            const totalEligible = elStudents.length;
            const turnout = totalEligible === 0 ? 0 : Math.round((totalVotes / totalEligible) * 100);
            const isLive = sess.open;

            return (
              <motion.div
                key={el.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl border border-emerald-200 shadow-sm overflow-hidden mb-3"
              >
                <div className="h-1.5 bg-linear-to-r from-emerald-500 to-teal-500" />
                <div className="p-4 lg:p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
                          {isLive ? (
                            <><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> {lang === "ml" ? "LIVE" : "LIVE"}</>
                          ) : (
                            <><Clock className="w-3 h-3" /> {lang === "ml" ? "തയ്യാർ" : "Ready"}</>
                          )}
                        </span>
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{el.class}</span>
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm">{lang === "ml" ? el.title_ml : el.title}</h3>
                      <p className="text-xs text-gray-400">{lang === "ml" ? el.position_ml : el.position}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-emerald-700">{totalVotes}/{totalEligible}</p>
                      <p className="text-[10px] text-gray-400">{lang === "ml" ? "വോട്ടുകൾ" : "votes"}</p>
                    </div>
                  </div>

                  {/* Turnout bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">{lang === "ml" ? "ടേർനൗട്ട്" : "Turnout"}</span>
                      <span className="font-bold text-gray-700">{turnout}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${turnout}%` }} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {!isLive ? (
                      <button
                        onClick={() => openSession(el)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all"
                      >
                        <Play className="w-3.5 h-3.5" />
                        {lang === "ml" ? "സെഷൻ തുറക്കുക" : "Open Session"}
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => setManagingEl(el)}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          {lang === "ml" ? "വോട്ടുകൾ നൽകുക" : "Record Votes"}
                        </button>
                        <button
                          onClick={() => closeSession(el.id)}
                          className="flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs px-3 py-2.5 rounded-xl transition-all border border-red-200"
                        >
                          <Square className="w-3.5 h-3.5" />
                          {lang === "ml" ? "നിർത്തുക" : "Close"}
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setResultsEl(el)}
                      className="flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2.5 rounded-xl transition-all"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Draft / Ready to Open ── */}
      {draftReady.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
            {lang === "ml" ? "📋 തുറക്കാൻ തയ്യാർ" : "📋 Ready to Open"}
          </p>
          <div className="space-y-2">
            {draftReady.map((el, i) => (
              <motion.div
                key={el.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center shrink-0">
                  <Vote className="w-5 h-5 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 text-sm truncate">{lang === "ml" ? el.title_ml : el.title}</p>
                  <p className="text-xs text-gray-400">{el.class} · {lang === "ml" ? el.position_ml : el.position}</p>
                </div>
                <button
                  onClick={() => openSession(el)}
                  className="flex items-center gap-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shrink-0"
                >
                  <Play className="w-3 h-3" />
                  {lang === "ml" ? "തുറക്കുക" : "Open"}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* ── Past Results ── */}
      {pastOwn.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
            {lang === "ml" ? "📁 കഴിഞ്ഞ ഫലങ്ങൾ" : "📁 Past Results"}
          </p>
          <div className="space-y-2">
            {pastOwn.map((el, i) => {
              const winner = el.winnerCandidateId ? el.candidates.find((c) => c.id === el.winnerCandidateId) : null;
              return (
                <motion.div
                  key={el.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3"
                >
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center shrink-0 text-xl">
                    {winner?.symbol ?? "🏆"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-sm truncate">{lang === "ml" ? el.title_ml : el.title}</p>
                    {winner && (
                      <p className="text-xs text-amber-700 font-semibold">
                        🏆 {lang === "ml" ? "ജേതാവ്" : "Winner"}: {winner.name}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">{el.class} · {el.totalVotesCast} {lang === "ml" ? "വോട്ടുകൾ" : "votes"}</p>
                  </div>
                  <button
                    onClick={() => setResultsEl(el)}
                    className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold px-3 py-2 rounded-xl transition-all shrink-0"
                  >
                    <Eye className="w-3 h-3" />
                    {lang === "ml" ? "ഫലം" : "Results"}
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {myElections.length === 0 && (
        <div className="text-center py-20">
          <Vote className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            {lang === "ml" ? "നിങ്ങളുടെ ക്ലാസിൽ ഇപ്പോൾ തിരഞ്ഞെടുപ്പൊന്നുമില്ല" : "No elections for your classes"}
          </p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          VOTING SESSION MODAL (teacher records each student vote)
      ═══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {managingEl && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end lg:items-center justify-center p-0 lg:p-4"
            onClick={() => { setManagingEl(null); setVotingStudent(null); setStudentPick(null); }}
          >
            <motion.div
              initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }}
              className="bg-white rounded-t-3xl lg:rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-linear-to-br from-teal-600 to-emerald-600 p-5 text-white rounded-t-3xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-teal-200 text-[11px] font-bold uppercase tracking-widest mb-1">
                      {lang === "ml" ? "🗳️ ലൈവ് വോട്ടിംഗ്" : "🗳️ Live Voting Session"}
                    </p>
                    <h2 className="text-lg font-bold">{lang === "ml" ? managingEl.title_ml : managingEl.title}</h2>
                    <p className="text-teal-200 text-xs mt-0.5">
                      {managingEl.class} · {totalVotesForElection(managingEl.id, managingEl)}/{getStudentsForElection(managingEl).length} {lang === "ml" ? "വോട്ടുകൾ" : "votes"}
                    </p>
                  </div>
                  <button onClick={() => { setManagingEl(null); setVotingStudent(null); }} className="bg-white/20 rounded-full p-1.5">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {!votingStudent ? (
                <div className="p-4">
                  <p className="text-xs font-bold text-gray-600 mb-3 uppercase tracking-wide">
                    {lang === "ml" ? "വിദ്യാർത്ഥി തിരഞ്ഞെടുക്കുക" : "Select student to record vote"}
                  </p>

                  <div className="space-y-2">
                    {getStudentsForElection(managingEl).map((s) => {
                      const voted = hasStudentVoted(managingEl.id, s.id, managingEl);
                      return (
                        <button
                          key={s.id}
                          disabled={voted}
                          onClick={() => { setVotingStudent({ id: s.id, name: s.name }); setStudentPick(null); }}
                          className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${
                            voted
                              ? "bg-emerald-50 border-emerald-200 cursor-default"
                              : "bg-white border-gray-200 hover:border-teal-300 hover:bg-teal-50"
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                            voted ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"
                          }`}>
                            {s.name.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-800 text-sm">{s.name}</p>
                            <p className="text-xs text-gray-400">{s.admissionNumber}</p>
                          </div>
                          {voted ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => closeSession(managingEl.id)}
                      className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-sm py-3 rounded-2xl border border-red-200 transition-all"
                    >
                      <Square className="w-4 h-4" />
                      {lang === "ml" ? "സെഷൻ അടയ്ക്കുക" : "Close Voting Session"}
                    </button>
                  </div>
                </div>
              ) : (
                /* Student Voting Screen */
                <div className="p-4">
                  <div className="flex items-center gap-3 bg-teal-50 rounded-2xl p-3 mb-4 border border-teal-100">
                    <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center font-bold text-teal-700 text-sm">
                      {votingStudent.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-teal-800 text-sm">{votingStudent.name}</p>
                      <p className="text-xs text-teal-600">{lang === "ml" ? "ഇപ്പോൾ വോട്ട് ചെയ്യുന്നു" : "Now voting"}</p>
                    </div>
                    <button onClick={() => { setVotingStudent(null); setStudentPick(null); }} className="ml-auto">
                      <RotateCcw className="w-4 h-4 text-teal-500" />
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 mb-3 font-medium">
                    {lang === "ml" ? "ഒരു സ്ഥാനാർത്ഥിയെ തിരഞ്ഞെടുക്കൂ" : "Select a candidate"}
                  </p>

                  <div className="space-y-2 mb-4">
                    {managingEl.candidates.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setStudentPick(c.id)}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all ${
                          studentPick === c.id
                            ? "border-teal-500 bg-teal-50"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <span className="text-2xl w-8">{c.symbol}</span>
                        <div className="flex-1 text-left">
                          <p className="font-bold text-gray-900 text-sm">{c.name}</p>
                          <p className="text-xs text-gray-400">{c.class}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          studentPick === c.id ? "border-teal-500 bg-teal-500" : "border-gray-300"
                        }`}>
                          {studentPick === c.id && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => { setVotingStudent(null); setStudentPick(null); }}
                      className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 font-semibold text-sm"
                    >
                      {lang === "ml" ? "← മടങ്ങുക" : "← Back"}
                    </button>
                    <button
                      disabled={!studentPick}
                      onClick={submitStudentVote}
                      className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all ${
                        studentPick
                          ? "bg-teal-600 hover:bg-teal-700 text-white"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      ✅ {lang === "ml" ? "വോട്ട് നൽകുക" : "Submit Vote"}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════
          RESULTS MODAL
      ═══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {resultsEl && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setResultsEl(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-linear-to-r from-emerald-600 to-teal-600 p-5 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-emerald-200 text-xs font-bold uppercase tracking-widest mb-1">
                      {lang === "ml" ? "ഫല സ്ലേറ്റ്" : "Results"}
                    </p>
                    <h2 className="text-lg font-bold">{lang === "ml" ? resultsEl.title_ml : resultsEl.title}</h2>
                  </div>
                  <button onClick={() => setResultsEl(null)} className="bg-white/20 rounded-full p-1.5">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-5">
                {/* Winner */}
                {resultsEl.winnerCandidateId && (() => {
                  const w = resultsEl.candidates.find((c) => c.id === resultsEl.winnerCandidateId);
                  return w ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 text-center">
                      <p className="text-3xl mb-2">{w.symbol}</p>
                      <p className="font-bold text-gray-900">{w.name}</p>
                      <p className="text-xs text-amber-700 font-bold mt-1">🏆 {lang === "ml" ? "ജേതാവ്" : "Winner"}</p>
                    </div>
                  ) : null;
                })()}
                <div className="space-y-3">
                  {[...resultsEl.candidates]
                    .map((c) => ({
                      ...c,
                      totalVotes: getVoteCountForCandidate(resultsEl.id, c.id, resultsEl),
                    }))
                    .sort((a, b) => b.totalVotes - a.totalVotes)
                    .map((c, i) => {
                      const total = totalVotesForElection(resultsEl.id, resultsEl) || 1;
                      return (
                        <div key={c.id} className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{c.symbol}</span>
                            <span className="font-bold text-gray-900 text-sm flex-1">{c.name}</span>
                            <span className="font-bold text-gray-700 text-sm">{c.totalVotes} {lang === "ml" ? "വോ." : "votes"}</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${barColors[i % barColors.length]} rounded-full`}
                              style={{ width: `${(c.totalVotes / total) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
                <p className="text-center text-xs text-gray-400 mt-4">
                  {lang === "ml" ? "ആകെ" : "Total"}: {totalVotesForElection(resultsEl.id, resultsEl)} / {resultsEl.totalEligibleVoters} {lang === "ml" ? "വോട്ടർമാർ" : "eligible voters"}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
