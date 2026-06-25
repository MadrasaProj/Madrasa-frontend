import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguageStore } from "@/store/language";
import { elections, Election } from "@/mock-data";
import {
 Vote, CheckCircle2, Trophy, Lock,
 ChevronRight, X, AlertCircle, Users
} from "lucide-react";

// Simulated: logged-in parent P001 with children S001, S006
const MY_PARENT_ID = "P001";
const MY_CHILDREN = [
 { id: "S001", name: "Ahmed Bin Abdullah", class: "Class 4" },
 { id: "S006", name: "Umar Farooq", class: "Class 3" },
];

// Runtime vote state (in a real app this would come from a store/API)
const initialVoteState: Record<string, string> = {}; // electionId -> candidateId

export default function ParentElectionsPage() {
 const { lang } = useLanguageStore();
 const [votedMap, setVotedMap] = useState<Record<string, string>>(initialVoteState);
 const [activeElection, setActiveElection] = useState<Election | null>(null);
 const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
 const [confirmStep, setConfirmStep] = useState(false);
 const [successEl, setSuccessEl] = useState<string | null>(null);

 // Only parent_vote type elections
 const parentElections = elections.filter((e) => e.type === "parent_vote");
 const activeOnes = parentElections.filter((e) => e.status === "active");
 const pastOnes = parentElections.filter((e) => e.status !== "active" && e.status !== "draft");

 const hasVoted = (elId: string) => {
 // Check pre-seeded votes for P001
 const el = elections.find((e) => e.id === elId);
 const seeded = el?.parentVotes?.find((v) => v.parentId === MY_PARENT_ID);
 return !!(seeded || votedMap[elId]);
 };

 const getVotedCandidate = (elId: string) => {
 const runtimeVote = votedMap[elId];
 if (runtimeVote) return runtimeVote;
 const el = elections.find((e) => e.id === elId);
 return el?.parentVotes?.find((v) => v.parentId === MY_PARENT_ID)?.candidateId ?? null;
 };

 const submitVote = () => {
 if (!activeElection || !selectedCandidate) return;
 setVotedMap((prev) => ({ ...prev, [activeElection.id]: selectedCandidate }));
 setSuccessEl(activeElection.id);
 setActiveElection(null);
 setSelectedCandidate(null);
 setConfirmStep(false);
 setTimeout(() => setSuccessEl(null), 3000);
 };

 const openVote = (el: Election) => {
 setActiveElection(el);
 setSelectedCandidate(null);
 setConfirmStep(false);
 };

 const statusLabel = (el: Election) => {
 if (el.status === "active") return lang === "ml" ? "✅ വോട്ടിംഗ് തുറന്നിരിക്കുന്നു" : "✅ Voting Open";
 if (el.status === "closed") return lang === "ml" ? "🔒 അടഞ്ഞു" : "🔒 Closed";
 if (el.status === "results_published") return lang === "ml" ? "🏆 ഫലം പ്രസിദ്ധീകരിച്ചു" : "🏆 Results Published";
 return lang === "ml" ? "ഡ്രാഫ്റ്റ്" : "Draft";
 };

 return (
 <DashboardLayout>
 {/* ── Header ── */}
 <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 lg:mb-6">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center">
 <Vote className="w-5 h-5 text-emerald-700" />
 </div>
 <div>
 <h1 className="text-xl font-bold text-gray-900">
 {lang === "ml" ? "തിരഞ്ഞെടുപ്പ്" : "Elections"}
 </h1>
 <p className="text-xs text-gray-500">
 {lang === "ml" ? "നിങ്ങളുടെ വോട്ട് ഇവിടെ രേഖപ്പെടുത്തുക" : "Cast your vote as a parent"}
 </p>
 </div>
 </div>
 </motion.div>

 {/* ── Success Toast ── */}
 <AnimatePresence>
 {successEl && (
 <motion.div
 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
 className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-lg flex items-center gap-2 text-sm font-semibold"
 >
 <CheckCircle2 className="w-4 h-4" />
 {lang === "ml" ? "വോട്ട് വിജയകരമായി രേഖപ്പെടുത്തി! ✅" : "Vote submitted successfully! ✅"}
 </motion.div>
 )}
 </AnimatePresence>

 {/* ── My Children Info ── */}
 <motion.div
 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
 className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 lg:p-4 mb-4 flex items-center gap-3"
 >
 <Users className="w-5 h-5 text-emerald-700 shrink-0" />
 <div>
 <p className="text-sm font-bold text-emerald-800">
 {lang === "ml" ? "നിങ്ങളുടെ കുട്ടികൾ" : "Voting on behalf of your children"}
 </p>
 <p className="text-xs text-emerald-600">
 {MY_CHILDREN.map((c) => `${c.name} (${c.class})`).join(" · ")}
 </p>
 </div>
 </motion.div>

 {/* ── Active Elections ── */}
 {activeOnes.length > 0 && (
 <div className="mb-6">
 <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
 {lang === "ml" ? "🗳️ തിരഞ്ഞെടുപ്പ് നടന്നുകൊണ്ടിരിക്കുന്നു" : "🗳️ Active Elections — Cast Your Vote"}
 </p>
 <div className="space-y-3">
 {activeOnes.map((el, i) => {
 const voted = hasVoted(el.id);
 const myVoteCandidateId = getVotedCandidate(el.id);
 const myVoteCandidate = myVoteCandidateId ? el.candidates.find((c) => c.id === myVoteCandidateId) : null;

 return (
 <motion.div
 key={el.id}
 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
 className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
 >
 <div className="h-1 bg-linear-to-r from-emerald-500 to-teal-500" />
 <div className="p-4 lg:p-5">
 <div className="flex items-start justify-between gap-3 mb-3">
 <div className="flex-1">
 <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full mb-1">
 <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
 {lang === "ml" ? "LIVE" : "LIVE"}
 </span>
 <h3 className="font-bold text-gray-900 text-sm leading-snug">
 {lang === "ml" ? el.title_ml : el.title}
 </h3>
 <p className="text-xs text-gray-500 mt-0.5">
 {lang === "ml" ? el.position_ml : el.position} · {lang === "ml" ? "അവസാന തീയതി" : "Ends"}: {el.endDate}
 </p>
 </div>
 </div>

 <p className="text-xs text-gray-500 mb-4 leading-relaxed">
 {lang === "ml" ? el.description_ml : el.description}
 </p>

 {voted ? (
 <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center gap-3">
 <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
 <CheckCircle2 className="w-4 h-4 text-emerald-600" />
 </div>
 <div>
 <p className="text-xs font-bold text-emerald-700">
 {lang === "ml" ? "✅ നിങ്ങൾ വോട്ട് ചെയ്തു" : "✅ Your Vote Submitted"}
 </p>
 {myVoteCandidate && (
 <p className="text-xs text-emerald-600">
 {lang === "ml" ? "തിരഞ്ഞെടുത്തത്" : "Voted for"}: {myVoteCandidate.symbol} {myVoteCandidate.name}
 </p>
 )}
 </div>
 </div>
 ) : (
 <button
 onClick={() => openVote(el)}
 className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-3 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-sm"
 >
 <Vote className="w-4 h-4" />
 {lang === "ml" ? "ഇപ്പോൾ വോട്ട് ചെയ്യുക" : "Cast Your Vote Now"}
 <ChevronRight className="w-4 h-4" />
 </button>
 )}
 </div>
 </motion.div>
 );
 })}
 </div>
 </div>
 )}

 {/* ── Past Elections ── */}
 {pastOnes.length > 0 && (
 <div>
 <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
 {lang === "ml" ? "📁 കഴിഞ്ഞ തിരഞ്ഞെടുപ്പുകൾ" : "📁 Past Elections"}
 </p>
 <div className="space-y-3">
 {pastOnes.map((el, i) => {
 const winner = el.winnerCandidateId ? el.candidates.find((c) => c.id === el.winnerCandidateId) : null;
 const myVoteCandidateId = getVotedCandidate(el.id);
 const myVoteCandidate = myVoteCandidateId ? el.candidates.find((c) => c.id === myVoteCandidateId) : null;

 return (
 <motion.div
 key={el.id}
 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
 className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4"
 >
 <div className="flex items-start gap-3">
 <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
 {el.status === "results_published" ? <Trophy className="w-5 h-5 text-amber-500" /> : <Lock className="w-5 h-5 text-gray-400" />}
 </div>
 <div className="flex-1">
 <h3 className="font-bold text-gray-800 text-sm">{lang === "ml" ? el.title_ml : el.title}</h3>
 <p className="text-xs text-gray-400">{lang === "ml" ? el.position_ml : el.position}</p>
 {winner && (
 <p className="text-xs text-amber-700 font-semibold mt-1">
 🏆 {lang === "ml" ? "ജേതാവ്" : "Winner"}: {winner.symbol} {winner.name}
 </p>
 )}
 {myVoteCandidate && (
 <p className="text-xs text-emerald-600 mt-0.5">
 ✅ {lang === "ml" ? "നിങ്ങൾ വോട്ട് ചെയ്തത്" : "Your vote"}: {myVoteCandidate.symbol} {myVoteCandidate.name}
 </p>
 )}
 </div>
 <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
 el.status === "results_published" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
 }`}>
 {statusLabel(el)}
 </span>
 </div>
 {/* Mini results bar */}
 {el.status === "results_published" && (
 <div className="mt-3 space-y-1.5">
 {[...el.candidates].sort((a, b) => b.voteCount - a.voteCount).map((c) => (
 <div key={c.id} className="flex items-center gap-2">
 <span className="text-sm w-5">{c.symbol}</span>
 <span className="text-xs text-gray-600 flex-1 truncate">{c.name}</span>
 <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
 <div
 className="h-full bg-emerald-500 rounded-full"
 style={{ width: `${el.totalVotesCast === 0 ? 0 : (c.voteCount / el.totalVotesCast) * 100}%` }}
 />
 </div>
 <span className="text-xs font-bold text-gray-700 w-6 text-right">{c.voteCount}</span>
 </div>
 ))}
 </div>
 )}
 </motion.div>
 );
 })}
 </div>
 </div>
 )}

 {activeOnes.length === 0 && pastOnes.length === 0 && (
 <div className="text-center py-20">
 <Vote className="w-12 h-12 text-gray-300 mx-auto mb-3" />
 <p className="text-gray-500 font-medium">
 {lang === "ml" ? "ഇപ്പോൾ തിരഞ്ഞെടുപ്പൊന്നും ലഭ്യമല്ല" : "No elections available right now"}
 </p>
 </div>
 )}

 {/* ── Voting Modal ── */}
 <AnimatePresence>
 {activeElection && (
 <motion.div
 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 bg-black/50 z-50 flex items-end lg:items-center justify-center p-0 lg:p-4"
 onClick={() => { setActiveElection(null); setConfirmStep(false); setSelectedCandidate(null); }}
 >
 <motion.div
 initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
 className="bg-white rounded-t-3xl lg:rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl"
 onClick={(e) => e.stopPropagation()}
 >
 {/* Modal Header */}
 <div className="bg-linear-to-br from-emerald-600 to-teal-600 rounded-t-3xl p-5 text-white">
 <div className="flex items-start justify-between gap-3">
 <div>
 <p className="text-emerald-200 text-[11px] font-bold uppercase tracking-widest mb-1">
 {lang === "ml" ? "🗳️ വോട്ടിംഗ് ബൂത്ത്" : "🗳️ Voting Booth"}
 </p>
 <h2 className="text-lg font-bold leading-snug">
 {lang === "ml" ? activeElection.title_ml : activeElection.title}
 </h2>
 <p className="text-emerald-200 text-xs mt-1">
 {lang === "ml" ? "ഒരു സ്ഥാനാർത്ഥിയെ തിരഞ്ഞെടുക്കുക" : "Choose one candidate — your vote cannot be changed"}
 </p>
 </div>
 <button
 onClick={() => { setActiveElection(null); setSelectedCandidate(null); setConfirmStep(false); }}
 className="bg-white/20 hover:bg-white/30 rounded-full p-1.5 shrink-0"
 >
 <X className="w-4 h-4" />
 </button>
 </div>
 </div>

 {!confirmStep ? (
 <div className="p-5">
 {/* Important notice */}
 <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-4 flex items-start gap-2">
 <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
 <p className="text-xs text-amber-700 leading-relaxed">
 {lang === "ml"
 ? "⚠️ ഒരു തവണ വോട്ട് ചെയ്‌തുകഴിഞ്ഞാൽ മാറ്റാൻ കഴിയില്ല. ശ്രദ്ധയോടെ തിരഞ്ഞെടുക്കുക."
 : "⚠️ Once submitted, your vote cannot be changed. Choose carefully."}
 </p>
 </div>

 {/* Candidates */}
 <p className="text-sm font-bold text-gray-800 mb-3">
 {lang === "ml" ? "സ്ഥാനാർത്ഥികൾ" : "Candidates"} ({activeElection.candidates.length})
 </p>
 <div className="space-y-3 mb-5">
 {activeElection.candidates.map((c) => (
 <button
 key={c.id}
 onClick={() => setSelectedCandidate(c.id)}
 className={`w-full text-left rounded-2xl border-2 transition-all p-4 ${
 selectedCandidate === c.id
 ? "border-emerald-500 bg-emerald-50 shadow-sm"
 : "border-gray-200 bg-white hover:border-gray-300"
 }`}
 >
 <div className="flex items-start gap-3">
 <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-2xl shrink-0">
 {c.symbol}
 </div>
 <div className="flex-1">
 <div className="flex items-center gap-2">
 <p className="font-bold text-gray-900">{c.name}</p>
 {selectedCandidate === c.id && (
 <CheckCircle2 className="w-4 h-4 text-emerald-600" />
 )}
 </div>
 <p className="text-xs text-gray-500 mb-1">{c.class} · {lang === "ml" ? c.bio_ml : c.bio}</p>
 </div>
 <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${
 selectedCandidate === c.id ? "border-emerald-500 bg-emerald-500" : "border-gray-300"
 }`}>
 {selectedCandidate === c.id && <div className="w-2 h-2 bg-white rounded-full" />}
 </div>
 </div>
 </button>
 ))}
 </div>

 <button
 disabled={!selectedCandidate}
 onClick={() => setConfirmStep(true)}
 className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all ${
 selectedCandidate
 ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
 : "bg-gray-100 text-gray-400 cursor-not-allowed"
 }`}
 >
 {lang === "ml" ? "തുടരുക →" : "Continue →"}
 </button>
 </div>
 ) : (
 /* Confirm Step */
 <div className="p-5">
 <div className="text-center mb-6">
 <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
 <Vote className="w-8 h-8 text-emerald-600" />
 </div>
 <h3 className="text-lg font-bold text-gray-900">
 {lang === "ml" ? "നിങ്ങളുടെ വോട്ട് ഉറപ്പുവരുത്തുക" : "Confirm Your Vote"}
 </h3>
 <p className="text-sm text-gray-500 mt-1">
 {lang === "ml" ? "ഒരിക്കൽ സ്ഥിരീകരിച്ചാൽ മാറ്റം വരുത്താൻ കഴിയില്ല" : "This action cannot be undone"}
 </p>
 </div>

 {/* Selected candidate summary */}
 {(() => {
 const c = activeElection.candidates.find((x) => x.id === selectedCandidate);
 return c ? (
 <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-5 text-center">
 <p className="text-3xl mb-2">{c.symbol}</p>
 <p className="font-bold text-gray-900">{c.name}</p>
 <p className="text-xs text-gray-500">{c.class}</p>
 <p className="text-xs text-emerald-700 font-semibold mt-1">
 {lang === "ml" ? "ഈ സ്ഥാനാർത്ഥിക്ക് വോട്ട് ചെയ്യുന്നു" : "You are voting for this candidate"}
 </p>
 </div>
 ) : null;
 })()}

 <div className="flex gap-3">
 <button
 onClick={() => setConfirmStep(false)}
 className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-all"
 >
 {lang === "ml" ? "← തിരികെ" : "← Back"}
 </button>
 <button
 onClick={submitVote}
 className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-all"
 >
 {lang === "ml" ? "✅ വോട്ട് സ്ഥിരീകരിക്കുക" : "✅ Confirm Vote"}
 </button>
 </div>
 </div>
 )}
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>
 </DashboardLayout>
 );
}
