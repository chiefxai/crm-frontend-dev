import React, { useState, useEffect, useRef } from 'react';
import {
  PhoneCall,
  PhoneOff,
  MessageSquare,
  Mic,
  Volume2,
  RefreshCw,
  Clock,
  Send,
  ThumbsUp,
  Activity,
  Smile,
  AlertCircle,
  Play,
  Pause,
  Plus,
  Trash2,
  Headphones,
  CheckCircle2,
  XCircle,
  Disc,
  Sparkles,
  HelpCircle,
  FileSpreadsheet,
  Check,
  ChevronRight,
  ArrowLeft,
  ChevronLeft,
  PhoneIncoming,
  Inbox,
  History,
  PhoneForwarded
} from 'lucide-react';
import { Lead, CallLog, VirtualNumber, TeamMember } from '../types';
import PageShell from './ui/PageShell';
import Widget from './ui/Widget';
import Modal from './ui/Modal';
import KpiCard from './ui/KpiCard';
import SearchInput from './ui/SearchInput';
import Button from './ui/Button';
import EmptyState from './ui/EmptyState';
import { apiFetch, getAuthToken, getApiBase, getPlayableRecordingUrl } from '../lib/api';
import { callCostInr, formatInr } from '../lib/pricing';

interface DialerSimulatorProps {
  leads: Lead[];
  callLogs: CallLog[];
  setCallLogs: React.Dispatch<React.SetStateAction<CallLog[]>>;
  leadsDatabase: Lead[];
  setLeadsDatabase: React.Dispatch<React.SetStateAction<Lead[]>>;
  virtualNumbers?: VirtualNumber[];
  setVirtualNumbers?: React.Dispatch<React.SetStateAction<VirtualNumber[]>>;
  tasks: DialTask[];
  setTasks: React.Dispatch<React.SetStateAction<DialTask[]>>;
  companyName: string;
  teamMembers?: TeamMember[];
  industry?: string;
}

// Broad language list for per-task selection — a generic "speak fluently
// in {language}" instruction is used for anything other than the default,
// which still uses the hand-tuned Tamil/Tanglish speech-pattern prompt.
// See services/config.js on the backend for where this gets applied.
export const TASK_LANGUAGE_OPTIONS = [
  'Tamil + English (Tanglish)',
  'Hindi',
  'Telugu',
  'Kannada',
  'Malayalam',
  'Bengali',
  'Marathi',
  'Gujarati',
  'Punjabi',
  'Odia',
  'English'
];
export const DEFAULT_TASK_LANGUAGE = TASK_LANGUAGE_OPTIONS[0];

// Super Star Health Insurance tele-script question bank — the AI asks
// these one by one, same sequential-flow mechanism as any other task's
// questions. Source: Super_Star_AI_Bot_Questions_Modern_Template.pdf.
const SUPER_STAR_QUESTIONS: string[] = [
  'Neenga pesura time convenient-a irukka?',
  'Super Star Health Insurance Plan pathi therinjika interest-a irukkeengala?',
  'Indha conversation-ku eppadi language prefer pannuveenga?',
  'Ippo unga kitta ethachum health insurance policy irukka?',
  'Ethana health insurance policies ippo unga kitta irukku?',
  'Unga existing policy ungalukku thaana illa family-kum sera irukka?',
  'Unga age enna sollunga?',
  'Neenga married-a illa single-a?',
  'Unga spouse age enna?',
  'Unga kitta ethana kuzhandhaigal irukanga?',
  'Avanga age enna?',
  'Neenga eppo edhu city-la irukeenga?',
  'Health insurance ungalukku mattum-a venuma illa full family-kum venuma?',
  'Enna level coverage neenga expect pannureenga?',
  'Unga premium budget evlo-nu oru idea irukka?',
  'Hospitalization expenses எப்படி cover aagum-nu therinjukka interest-a?',
  'Indha policy-la 24-hour hospitalization requirement pathi therinjikanuma?',
  'Day-care treatments pathi therinjikanuma?',
  'Pre and post hospitalization coverage pathi therinjikanuma?',
  'AYUSH treatments cover aagumaanu therinjikanuma?',
  'Ambulance mattum air ambulance coverage pathi therinjikanuma?',
  'Organ donor expenses pathi therinjikanuma?',
  'Home-care mattum domiciliary hospitalization pathi therinjikanuma?',
  'Second medical opinion facility pathi therinjikanuma?',
  'Cumulative bonus eppadi work aagum-nu therinjikanuma?',
  'Sum insured automatic-a eppadi restore aagum-nu therinjikanuma?',
  'Unlimited tele-consultation facility pathi therinjikanuma?',
  'AI-driven face scan facility pathi therinjikanuma?',
  'Dental check-up benefit pathi therinjikanuma?',
  'Star Wellness Program mattum premium discounts pathi therinjikanuma?',
  'Smart Network option select panni premium kammi pannikanuma?',
  'Quick Shield moolama sila pre-existing diseases-kum coverage venuma?',
  'Hospitalization time-la use aagura consumable items-kum coverage venuma?',
  'Neenga marriage plan panreengala, future spouse-kum coverage venuma?',
  'Maternity coverage add pannikanuma?',
  'Assisted reproduction treatment-kum coverage venuma?',
  'Ippo neenga pregnant-a irukeengala, Women Care option interest-a irukka?',
  'High-end diagnostic tests-kum extra coverage venuma?',
  'Personal Accident Cover add pannikanuma?',
  'Annual health check-up benefit venuma?',
  'Voluntary co-payment vachi premium kammi pannikanuma?',
  'Voluntary deductible vachi premium kammi pannikanuma?',
  'Room category change panni premium kammi pannikanuma?',
  'International second medical opinion venuma?',
  'Durable medical equipment-kum coverage venuma?',
  'Hospital Cash Benefit add pannikanuma?',
  'Specified diseases-ku waiting period kammi pannikanuma?',
  'Pre-existing diseases-ku waiting period kammi pannikanuma?',
  'Limitless Care option pathi therinjikanuma?',
  'Super Star Bonus option add pannikanuma?',
  'Ippo unga kitta ethachum pre-existing medical conditions irukka?',
  'Irundha, andha medical conditions enna-nu sollunga?',
  'Munnadi ethachum major medical treatment illa hospitalization aagi irukeengala?',
  'Ippo neenga ethachum medical treatment eduthu kittu irukeengala?',
  'Pre-existing diseases eppadi cover aagum-nu therinjikanuma?',
  '30-day initial waiting period pathi explain pannattuma?',
  'Ethana conditions-ku two-year waiting period irukku-nu therinjikanuma?',
  'Pre-existing diseases-ku waiting period pathi therinjikanuma?',
  'Waiting period eppadi kammi pannalam-nu therinjikanuma?',
  'Cashless hospitalization facility eppadi work aagum-nu therinjikanuma?',
  'Network-ku veliya irukura hospital-la treatment eppadi work aagum-nu therinjikanuma?',
  'Policy cancellation rules pathi therinjikanuma?',
  '30-day free-look cancellation period pathi therinjikanuma?',
  'Premium refund kidaikkura conditions pathi explain pannattuma?',
  'Super Star policy-ku proceed pannalaama?',
  'Unga full name sollunga?',
  'Unga email address sollunga?',
  'Proposal form-ku unga address sollunga?',
  'Online proposal form fill panna help venuma?',
  'Payment UPI, debit card, credit card illa NEFT moolama pannuveengala?',
  'Required medical information ellam correct-a kudutheengala?',
  'Nomination details complete pannikanuma?'
];

interface DialTask {
  id: string;
  name: string;
  questions: string[];
  leadIds: string[];
  status: 'Pending' | 'In Progress' | 'Completed';
  createdAt: string;
  language?: string;
  assignedTeamMemberId?: string;
  starhealthEnabled?: boolean;
  callResults: {
    [leadId: string]: {
      status: 'Pending' | 'Calling' | 'Completed' | 'No Answer' | 'Skipped';
      duration: number;
      transcript: { speaker: 'AI' | 'Customer'; text: string; timestamp: string }[];
      sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Unknown';
      intent: 'Interested' | 'Not Interested' | 'Callback Scheduled' | 'Wrong Number' | 'Unknown';
      summary: string;
      answers: { [question: string]: string };
      recordingUrl?: string;
    }
  };
}

export default function DialerSimulator({
  leads,
  callLogs,
  setCallLogs,
  leadsDatabase,
  setLeadsDatabase,
  virtualNumbers = [],
  setVirtualNumbers,
  tasks,
  setTasks,
  companyName,
  teamMembers = [],
  industry
}: DialerSimulatorProps) {
  const isInsurance = industry === 'insurance';
  // Inbound Call states
  const [dialerMode, setDialerMode] = useState<'outbound' | 'inbound'>('outbound');

  const activeVirtualNumbers = virtualNumbers;

  // Real inbound call history — sourced from `callLogs` (populated from the
  // backend's `call_logs` table, tagged `direction` by the Vobiz/Twilio
  // webhooks themselves), not the fake simulator's `inboundCallLogs`.
  const realInboundCallLogs = callLogs.filter((log) => log.direction === 'inbound');

  // AI Voice and Prompt Configuration states from screenshots
  const [voicePersona, setVoicePersona] = useState<string>(() => {
    return localStorage.getItem('chiefx_voice_persona') || 'Priya — Female (friendly & clear)';
  });
  const [emotionIntensity, setEmotionIntensity] = useState<number>(() => {
    return Number(localStorage.getItem('chiefx_emotion_intensity') || '78');
  });
  const [speechSpeed, setSpeechSpeed] = useState<number>(() => {
    return Number(localStorage.getItem('chiefx_speech_speed') || '52');
  });
  const [friendliness, setFriendliness] = useState<number>(() => {
    return Number(localStorage.getItem('chiefx_friendliness') || '82');
  });
  const [systemPrompt, setSystemPrompt] = useState<string>(() => {
    return localStorage.getItem('chiefx_system_prompt') || 
`You are a real human speaking out loud - not an AI, not reading a script.

========================================
CORE RULE - SPEAK THE VERBATIM FORM, NOT THE NORMALIZED FORM
========================================

Real Tamil speakers do not say the "correct" written form of a word. They contract it. This is the single most reliable, verified pattern in real Tamil speech data, and it holds no matter what the topic is or who the speaker is talking to. Apply it constantly...`;
  });
  const [isConfigSaving, setIsConfigSaving] = useState(false);
  const [configSaveSuccess, setConfigSaveSuccess] = useState(false);

  // The AI's spoken name for intro/greeting lines — derived from the
  // configured voice persona (e.g. "Priya — Female (friendly & clear)")
  // instead of a hardcoded name unrelated to what's actually configured.
  const agentDisplayName = voicePersona.split('—')[0].trim() || 'the assistant';

  const handleSaveConfig = () => {
    setIsConfigSaving(true);
    localStorage.setItem('chiefx_voice_persona', voicePersona);
    localStorage.setItem('chiefx_emotion_intensity', String(emotionIntensity));
    localStorage.setItem('chiefx_speech_speed', String(speechSpeed));
    localStorage.setItem('chiefx_friendliness', String(friendliness));
    localStorage.setItem('chiefx_system_prompt', systemPrompt);
    
    setTimeout(() => {
      setIsConfigSaving(false);
      setConfigSaveSuccess(true);
      setTimeout(() => setConfigSaveSuccess(false), 3000);
    }, 600);
  };

  // Tasks — real, persisted via App.tsx (props), not localStorage.

  // Active Selected Task
  const [selectedTaskId, setSelectedTaskId] = useState<string>(() => {
    return tasks[0]?.id || '';
  });

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || tasks[0];

  // Task Creation Form States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskLanguage, setNewTaskLanguage] = useState(DEFAULT_TASK_LANGUAGE);
  const [newTaskAssignedMemberId, setNewTaskAssignedMemberId] = useState('');
  const [newStarhealthEnabled, setNewStarhealthEnabled] = useState(false);
  const [newQuestions, setNewQuestions] = useState<string[]>([]);
  const [tempQuestionInput, setTempQuestionInput] = useState('');
  const [selectedFormLeadIds, setSelectedFormLeadIds] = useState<string[]>([]);
  const [modalLeadSearch, setModalLeadSearch] = useState('');

  // Call simulator live states
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [twilioCallSid, setTwilioCallSid] = useState<string | null>(null);
  const [vobizCallSid, setVobizCallSid] = useState<string | null>(null);
  const [piopiyCallSid, setPiopiyCallSid] = useState<string | null>(null);
  const [callState, setCallState] = useState<'idle' | 'dialing' | 'connected' | 'completed'>('idle');
  // When on, finishing a call automatically dials the next pending lead in
  // the task instead of requiring "Auto-Dial Next List Target" + "Dial"
  // clicked separately for every single lead.
  const [autoDialOn, setAutoDialOn] = useState(false);
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState<{ speaker: 'AI' | 'Customer'; text: string; timestamp: string }[]>([]);
  const [customerUtterance, setCustomerUtterance] = useState('');
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [currentSentiment, setCurrentSentiment] = useState<'Positive' | 'Neutral' | 'Negative' | 'Unknown'>('Neutral');
  const [currentIntent, setCurrentIntent] = useState<'Interested' | 'Not Interested' | 'Callback Scheduled' | 'Wrong Number' | 'Unknown'>('Unknown');

  // Multi-question state
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [extractedAnswers, setExtractedAnswers] = useState<{ [question: string]: string }>({});

  // Audio Playback states for Call Tape (Supports both Outbound and Inbound recordings)
  const [playingTapeId, setPlayingTapeId] = useState<string | null>(null);
  const [playingTapeType, setPlayingTapeType] = useState<'outbound' | 'inbound'>('outbound');
  const [isTapePlaying, setIsTapePlaying] = useState(false);
  const [tapeProgress, setTapeProgress] = useState(0);
  const [tapeSpeed, setTapeSpeed] = useState<number>(1);
  const [tapeDuration, setTapeDuration] = useState<number>(0);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Outbound numbers this org has actually provisioned (Settings > Numbers)
  // that can really place a call — Twilio, Vobiz, and PIOPIY are wired to
  // real dialing; other provider labels are display-only for inbound routing.
  const dialableNumbers = virtualNumbers.filter((n) => /twilio|vobiz|piopiy/i.test(n.provider || ''));
  const [selectedOutboundNumber, setSelectedOutboundNumber] = useState<string>('');
  useEffect(() => {
    if (!selectedOutboundNumber && dialableNumbers.length) {
      setSelectedOutboundNumber(dialableNumbers[0].number);
    }
  }, [dialableNumbers, selectedOutboundNumber]);

  // Auto-redial status per phone (see services/dialerRetryEngine.js) — keyed
  // by the last 10 digits so formatting differences (with/without country
  // code, spaces, dashes) between a lead's saved number and what Vobiz
  // stored on the call_logs row still match up.
  const [retryStatuses, setRetryStatuses] = useState<Record<string, {
    status: string; attemptNumber: number; nextRetryAt: string | null; retryStatus: string;
  }>>({});
  const normalizePhone = (p: string) => (p || '').replace(/\D/g, '').slice(-10);
  useEffect(() => {
    let cancelled = false;
    const fetchRetries = async () => {
      try {
        const res = await apiFetch('/api/dialer-retries');
        const data = await res.json();
        if (cancelled || !Array.isArray(data)) return;
        const byPhone: typeof retryStatuses = {};
        for (const row of data) {
          const key = normalizePhone(row.phone);
          if (key) byPhone[key] = row;
        }
        setRetryStatuses(byPhone);
      } catch {
        // Silent — this is a supplementary status badge, not core dialer function.
      }
    };
    fetchRetries();
    const interval = setInterval(fetchRetries, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Active call timer
  useEffect(() => {
    if (callState === 'connected') {
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  // Scroll transcript to bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript.length, isAiResponding]);

  // Real audio playback for the call recording <audio> element — mirrors
  // isTapePlaying/tapeProgress/tapeSpeed off the actual element instead of
  // a fake setInterval animation, so the player genuinely plays the
  // uploaded recording rather than just simulating a moving progress bar.
  useEffect(() => {
    const el = audioElRef.current;
    if (!el) return;
    if (isTapePlaying) {
      el.play().catch(() => setIsTapePlaying(false));
    } else {
      el.pause();
    }
  }, [isTapePlaying, playingTapeId]);

  useEffect(() => {
    const el = audioElRef.current;
    if (el) el.playbackRate = tapeSpeed;
  }, [tapeSpeed]);

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Add question in creator
  const handleAddQuestion = () => {
    if (tempQuestionInput.trim()) {
      setNewQuestions([...newQuestions, tempQuestionInput.trim()]);
      setTempQuestionInput('');
    }
  };

  const handleRemoveQuestion = (idx: number) => {
    setNewQuestions(newQuestions.filter((_, i) => i !== idx));
  };

  // Toggle lead checkbox in task creator
  const handleToggleLeadSelection = (leadId: string) => {
    if (selectedFormLeadIds.includes(leadId)) {
      setSelectedFormLeadIds(selectedFormLeadIds.filter((id) => id !== leadId));
    } else {
      setSelectedFormLeadIds([...selectedFormLeadIds, leadId]);
    }
  };

  // Create Task Submission
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim() || selectedFormLeadIds.length === 0 || newQuestions.length === 0) {
      alert('Please fill out task name, select at least one lead and input a question.');
      return;
    }

    const newTask: DialTask = {
      // dialer_tasks.id is a global primary key, not scoped per org — a
      // sequential "TASK-101, TASK-102..." counter based on this org's own
      // local task count collides with another org's tasks the moment both
      // start counting from the same number (this is exactly what caused
      // "my task disappeared": the insert 500'd on a duplicate key and the
      // failure was never surfaced). Use a value no other org can generate.
      id: `TASK-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name: newTaskName.trim(),
      questions: newQuestions,
      leadIds: selectedFormLeadIds,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      callResults: {},
      language: newTaskLanguage,
      assignedTeamMemberId: newTaskAssignedMemberId || undefined,
      starhealthEnabled: isInsurance && newStarhealthEnabled
    };

    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);
    setSelectedTaskId(newTask.id);
    setShowCreateModal(false);

    // Reset Form — blank, not pre-filled from anywhere. The user wants to
    // type this task's questions themselves every time, not start from
    // any default (org's, industry's, or otherwise).
    setNewTaskName('');
    setNewTaskLanguage(DEFAULT_TASK_LANGUAGE);
    setNewTaskAssignedMemberId('');
    setNewStarhealthEnabled(false);
    setNewQuestions([]);
    setSelectedFormLeadIds([]);
  };

  const openCreateTaskModal = () => {
    setNewQuestions([]);
    setShowCreateModal(true);
  };

  const handleInitiateVobizCall = async (lead: Lead) => {
    if (callState === 'dialing' || callState === 'connected') return;

    setActiveLead(lead);
    setCallState('dialing');
    setDuration(0);
    setTranscript([]);
    setCurrentSentiment('Neutral');
    setCurrentIntent('Unknown');
    setActiveQuestionIndex(0);
    setExtractedAnswers({});
    setPlayingTapeId(null);
    setIsTapePlaying(false);

    try {
      const assignedMember = selectedTask?.assignedTeamMemberId
        ? teamMembers.find((m) => m.id === selectedTask.assignedTeamMemberId)
        : undefined;
      const res = await apiFetch('/api/vobiz/call', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: lead.phone,
          questions: selectedTask ? selectedTask.questions : [],
          from: selectedOutboundNumber || undefined,
          language: selectedTask?.language || undefined,
          assignedContact: assignedMember ? { name: assignedMember.name, phone: assignedMember.phone } : undefined,
          starhealthEnabled: !!selectedTask?.starhealthEnabled
        })
      });
      const data = await res.json();
      if (data.success && data.callSid) {
        setVobizCallSid(data.callSid);
        setCallState('connected');
        setTranscript([
          {
            speaker: 'AI',
            text: `[Vobiz Call Started] Dialing ${lead.name} at ${lead.phone}...`,
            timestamp: new Date().toTimeString().split(' ')[0]
          }
        ]);
      } else {
        throw new Error(data.error || 'Failed to initiate Vobiz call');
      }
    } catch (err: any) {
      setCallState('idle');
      alert(`Vobiz call failed: ${err.message}`);
    }
  };

  const handleHangupVobizCall = async () => {
    setVobizCallSid(null);
    handleHangupCall();
  };

  const handleInitiatePiopiyCall = async (lead: Lead) => {
    if (callState === 'dialing' || callState === 'connected') return;
    setActiveLead(lead);
    setCallState('dialing');
    setDuration(0);
    setTranscript([]);
    setCurrentSentiment('Neutral');
    setCurrentIntent('Unknown');
    setActiveQuestionIndex(0);
    setExtractedAnswers({});
    setPlayingTapeId(null);
    setIsTapePlaying(false);
    try {
      const assignedMember = selectedTask?.assignedTeamMemberId
        ? teamMembers.find((m) => m.id === selectedTask.assignedTeamMemberId)
        : undefined;
      const res = await apiFetch('/api/piopiy/call', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: lead.phone,
          questions: selectedTask ? selectedTask.questions : [],
          from: selectedOutboundNumber || undefined,
          language: selectedTask?.language || undefined,
          assignedContact: assignedMember ? { name: assignedMember.name, phone: assignedMember.phone } : undefined,
          starhealthEnabled: !!selectedTask?.starhealthEnabled
        })
      });
      const data = await res.json();
      if (data.success && data.callSid) {
        setPiopiyCallSid(data.callSid);
        setCallState('connected');
        setTranscript([{ speaker: 'AI', text: `[Piopiy Call Started] Dialing ${lead.name} at ${lead.phone}...`, timestamp: new Date().toTimeString().split(' ')[0] }]);
      } else {
        throw new Error(data.error || 'Failed to initiate Piopiy call');
      }
    } catch (err: any) {
      setCallState('idle');
      alert(`Piopiy call failed: ${err.message}`);
    }
  };

  const handleHangupPiopiyCall = async () => {
    if (piopiyCallSid) {
      try {
        await apiFetch('/api/piopiy/hangup', { method: 'POST', body: JSON.stringify({ callSid: piopiyCallSid }) });
      } catch (err) { console.error('Piopiy hangup failed:', err); }
    }
    setPiopiyCallSid(null);
    handleHangupCall();
  };

  const handleInitiateTwilioCall = async (lead: Lead) => {
    if (callState === 'dialing' || callState === 'connected') return;

    setActiveLead(lead);
    setCallState('dialing');
    setDuration(0);
    setTranscript([]);
    setCurrentSentiment('Neutral');
    setCurrentIntent('Unknown');
    setActiveQuestionIndex(0);
    setExtractedAnswers({});
    setPlayingTapeId(null);
    setIsTapePlaying(false);

    try {
      const assignedMemberTwilio = selectedTask?.assignedTeamMemberId
        ? teamMembers.find((m) => m.id === selectedTask.assignedTeamMemberId)
        : undefined;
      const res = await apiFetch('/api/twilio/call', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: lead.phone,
          questions: selectedTask ? selectedTask.questions : [],
          from: selectedOutboundNumber || undefined,
          language: selectedTask?.language || undefined,
          assignedContact: assignedMemberTwilio ? { name: assignedMemberTwilio.name, phone: assignedMemberTwilio.phone } : undefined
        })
      });
      const data = await res.json();
      if (data.success && data.callSid) {
        setTwilioCallSid(data.callSid);
        setCallState('connected');
        setTranscript([
          {
            speaker: 'AI',
            text: `[Twilio Call Started] Dialing ${lead.name} at ${lead.phone}...`,
            timestamp: new Date().toTimeString().split(' ')[0]
          }
        ]);
      } else {
        throw new Error(data.error || 'Failed to initiate Twilio call');
      }
    } catch (err: any) {
      setCallState('idle');
      alert(`Twilio call failed: ${err.message}`);
    }
  };

  const handleHangupTwilioCall = async () => {
    if (!activeLead || !twilioCallSid) return;
    try {
      await fetch('/api/twilio/hangup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callSid: twilioCallSid })
      });
    } catch (err) {
      console.error("Failed to hang up Twilio call:", err);
    }
    setTwilioCallSid(null);
    handleHangupCall();
  };

  // Hangup call and save detailed conversation history, questionnaire answers, and tape logs.
  // `realCallLog` — when this was triggered by the real "call_completed" SSE
  // event (see the effect above) — carries the actual backend-saved call
  // data (recording, duration, sentiment). Without it, the outbound tape
  // player always showed "No recording available" even though the call
  // really was recorded: this function only ever wrote the local
  // simulated timer/transcript, never the real Supabase-hosted recording URL.
  const handleHangupCall = (realCallLog?: { recordingUrl?: string; duration?: number; sentiment?: string; summary?: string; callId?: string; transcript?: { speaker: 'AI' | 'Customer'; text: string; timestamp: string }[] }) => {
    if (!activeLead) return;
    setCallState('completed');

    // Create Call Log in state
    const callLogId = `CALL-${600 + callLogs.length + 1}`;
    const answersText = Object.entries(extractedAnswers)
      .map(([q, a]) => `• ${q} Answered: "${a}"`)
      .join('\n');

    const summaryText = `Daily Task Call [${selectedTask.name}]. Customer responded with ${currentSentiment} sentiment and ${currentIntent} intent.\n\nAssigned Questionnaire Responses:\n${answersText || 'No answers collected.'}`;

    // Update results inside selected task
    const updatedTasks = tasks.map((task) => {
      if (task.id === selectedTask.id) {
        const isAllLeadsDialed = task.leadIds.every((lId) => {
          if (lId === activeLead.id) return true;
          return task.callResults[lId]?.status === 'Completed';
        });

        return {
          ...task,
          status: isAllLeadsDialed ? 'Completed' as const : 'In Progress' as const,
          callResults: {
            ...task.callResults,
            [activeLead.id]: {
              status: 'Completed' as const,
              duration: realCallLog?.duration ?? duration,
              // Real AI-driven outbound calls never go through the manual
              // simulation input flow that fills the local `transcript`
              // state — confirmed live: Archive Room showed a real,
              // completed outbound call with zero conversation displayed,
              // because it was reading that always-empty local state
              // instead of the actual saved transcript from the call.
              transcript: realCallLog?.transcript || transcript,
              sentiment: (realCallLog?.sentiment as typeof currentSentiment) || currentSentiment,
              intent: currentIntent,
              summary: realCallLog?.summary || summaryText,
              answers: { ...extractedAnswers },
              recordingUrl: realCallLog?.recordingUrl,
              // The real call_logs row's id — server.js now writes this as
              // the same internal call id lead_responses.call_id uses, so
              // this is the one precise way to fetch THIS call's actual
              // answers instead of guessing by phone (which returns every
              // answer that phone number ever gave, across every call).
              callId: realCallLog?.callId
            }
          }
        };
      }
      return task;
    });

    setTasks(updatedTasks);

    // Save globally to call logs — but only when there's no real backend
    // record for this call already. When realCallLog is set (the real
    // "call_completed" SSE event fired — see the effect above), the
    // backend's own vobizProxy.js/twilioProxy.js finalizeCall() already
    // saved the authoritative row (real id, real recording, correct
    // direction) the moment the call ended. Adding a second synthetic
    // entry here and syncing it via /api/call-logs/sync (a full
    // delete-and-reinsert of the whole table) just double-logged every
    // real call under a second fake "CALL-6xx" id with no direction set
    // — confirmed live: yesterday's call count included duplicates. The
    // real entry surfaces on its own next time call logs are reloaded.
    if (!realCallLog) {
      const globalLog: CallLog = {
        id: callLogId,
        leadId: activeLead.id,
        leadName: activeLead.name,
        campaignId: selectedTask.id,
        duration: duration,
        status: 'Completed',
        sentiment: currentSentiment,
        intent: currentIntent,
        transcript: transcript,
        summary: summaryText,
        createdAt: new Date().toISOString()
      };
      setCallLogs([globalLog, ...callLogs]);
    }

    // Update Lead status in leads database
    const updatedDatabase = leadsDatabase.map((l) => {
      if (l.id === activeLead.id) {
        return {
          ...l,
          status: currentIntent === 'Interested' ? 'Qualified' : currentIntent === 'Not Interested' ? 'Unqualified' : l.status,
          notes: `Dialer Task Summary [${selectedTask.name}]:\n${summaryText}\n\n${l.notes}`
        };
      }
      return l;
    });
    setLeadsDatabase(updatedDatabase);
  };

  // Submit Caller response - proceed question by question!
  const handleSendUtterance = async (utteranceText: string) => {
    if (!utteranceText.trim() || isAiResponding || !activeLead) return;

    const currentQuestion = selectedTask.questions[activeQuestionIndex];
    const timeStr = new Date().toTimeString().split(' ')[0];

    // Save answer
    const newAnswers = {
      ...extractedAnswers,
      [currentQuestion]: utteranceText
    };
    setExtractedAnswers(newAnswers);

    const updatedTranscript = [
      ...transcript,
      { speaker: 'Customer' as const, text: utteranceText, timestamp: timeStr }
    ];
    setTranscript(updatedTranscript);
    setCustomerUtterance('');
    setIsAiResponding(true);

    // Advance index
    const nextIndex = activeQuestionIndex + 1;

    try {
      // Call Gemini API server
      const res = await fetch('/api/simulate-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadName: activeLead.name,
          loanAmount: activeLead.amountRequested,
          prompt: `Today's Daily Dialing task: "${selectedTask.name}".
AI Voice Persona: ${voicePersona} (Emotion Intensity: ${emotionIntensity}%, Speed: ${speechSpeed}%, Friendliness: ${friendliness}%).
System Instructions/Guidelines to strictly follow:
${systemPrompt}

Currently on question ${nextIndex} out of ${selectedTask.questions.length}. Next question to ask them is: "${selectedTask.questions[nextIndex] || 'None, wrap up conversation and say goodbye.'}"`,
          transcript: updatedTranscript,
          customerUtterance: utteranceText
        })
      });

      const data = await res.json();
      if (data.success) {
        let aiReply = data.reply;
        setCurrentSentiment(data.sentiment);
        setCurrentIntent(data.intent);

        // If there's a next question, append or formulate it
        if (nextIndex < selectedTask.questions.length) {
          const nextQuestion = selectedTask.questions[nextIndex];
          aiReply = `${data.reply} Moving to my next point: ${nextQuestion}`;
          setActiveQuestionIndex(nextIndex);
        } else {
          aiReply = `${data.reply} I have successfully recorded all your answers on our secure audio line. Thank you so much for your time, goodbye!`;
          setActiveQuestionIndex(nextIndex);
        }

        setTranscript((prev) => [
          ...prev,
          {
            speaker: 'AI',
            text: data.degraded ? `[Estimated — AI unavailable, using scripted fallback] ${aiReply}` : aiReply,
            timestamp: new Date().toTimeString().split(' ')[0]
          }
        ]);

        // Auto hang up if final question completed
        if (nextIndex >= selectedTask.questions.length || data.isFinished) {
          setTimeout(() => {
            handleHangupCall();
          }, 4500);
        }
      }
    } catch (err: any) {
      console.error(err);
      // The AI reply genuinely failed to generate — say so instead of
      // fabricating a plausible-sounding scripted response. Don't advance
      // the question index or touch sentiment/intent, since nothing was
      // actually answered by the AI.
      setTranscript((prev) => [
        ...prev,
        {
          speaker: 'AI',
          text: `[AI response unavailable — ${err?.message || 'the call assistant failed to respond'}. Please retry or continue manually.]`,
          timestamp: new Date().toTimeString().split(' ')[0]
        }
      ]);
    } finally {
      setIsAiResponding(false);
    }
  };

  // Skip lead
  const handleSkipLead = (leadId: string) => {
    const updatedTasks = tasks.map((task) => {
      if (task.id === selectedTask.id) {
        return {
          ...task,
          callResults: {
            ...task.callResults,
            [leadId]: {
              status: 'Skipped' as const,
              duration: 0,
              transcript: [],
              sentiment: 'Unknown' as const,
              intent: 'Unknown' as const,
              summary: 'Call skipped by representative.',
              answers: {}
            }
          }
        };
      }
      return task;
    });
    setTasks(updatedTasks);
  };  // Open Cassette Recording Player for a Completed Call
  const handleOpenTapePlayer = (id: string, type: 'outbound' | 'inbound' = 'outbound') => {
    setPlayingTapeId(id);
    setPlayingTapeType(type);
    setTapeProgress(0);
    setTapeDuration(0);
    setIsTapePlaying(true);
  };

  const activeTapeResult = playingTapeType === 'inbound'
    ? realInboundCallLogs.find((log) => log.id === playingTapeId)
    : selectedTask?.callResults[playingTapeId || ''];

  // Inbound tape entries are real CallLog rows (have a stable call_logs
  // id), so Vobiz-hosted recordings can go through the authenticated
  // proxy (see getPlayableRecordingUrl — media.vobiz.ai requires headers
  // a plain <audio src> can't send). Outbound dialer-task results don't
  // carry that id, so those still use the raw URL — a pre-existing gap,
  // not something introduced here.
  const playableTapeRecordingUrl = activeTapeResult?.recordingUrl
    ? (playingTapeType === 'inbound'
        ? getPlayableRecordingUrl((activeTapeResult as CallLog).id, activeTapeResult.recordingUrl)
        : activeTapeResult.recordingUrl)
    : undefined;

  const activeTapeLead = playingTapeType === 'inbound'
    ? null
    : leadsDatabase.find((l) => l.id === playingTapeId);

  const dialLead = (lead: Lead) => {
    const num = dialableNumbers.find((n) => n.number === selectedOutboundNumber);
    const provider = num?.provider || '';
    if (/vobiz/i.test(provider)) handleInitiateVobizCall(lead);
    else if (/piopiy/i.test(provider)) handleInitiatePiopiyCall(lead);
    else handleInitiateTwilioCall(lead);
  };

  // Detects the REAL end of a live outbound call (the AI hanging up via
  // end_call, or the callee hanging up) — without this, `callState` only
  // ever flipped to 'completed' from a manual "Hang Up" button click, so
  // Continuous Dialer Mode would sit stuck on 'connected' forever for any
  // call the AI ended on its own, never advancing to the next lead. The
  // backend already broadcasts a real "call_completed" event once the call
  // is actually logged (services/vobizProxy.js / twilioProxy.js,
  // regardless of who hung up) — this just listens for it and matches it
  // to the lead currently on the line.
  useEffect(() => {
    if (callState !== 'connected' || !activeLead) return;
    const token = getAuthToken();
    if (!token) return;

    const sanitize = (n: string) => (n || '').replace(/[\s\-\(\)\+]+/g, '');
    const activePhone = sanitize(activeLead.phone);

    const source = new EventSource(`${getApiBase()}/api/logs-stream?token=${encodeURIComponent(token)}`);
    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type !== 'call_completed' || !data.callLog) return;
        const log = data.callLog;
        if (log.direction !== 'outbound') return;
        // Match on callerNumber (E.164 phone stored separately from display name)
        // falling back to leadName for older logs that predate the callerNumber column.
        const logPhone = sanitize(log.callerNumber || log.leadName || '');
        if (logPhone !== activePhone) return;
        handleHangupCall({
          recordingUrl: log.recordingUrl,
          duration: log.duration,
          sentiment: log.sentiment,
          summary: log.summary,
          callId: log.id,
          transcript: log.transcript
        });
      } catch {
        // non-JSON keepalive/init messages — ignore
      }
    };
    return () => source.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callState, activeLead]);

  // Continuous auto-dial: once a call finishes, if autoDialOn is set, move
  // to the next pending lead and place the call immediately — no manual
  // "Auto-Dial Next" + "Dial" click pair needed per lead in the list. A
  // short pause between calls keeps this from looking like a rapid-fire
  // robo-dialer and gives the UI time to show the "completed" state.
  useEffect(() => {
    if (!autoDialOn || callState !== 'completed' || !selectedTask || dialableNumbers.length === 0) return;
    const nextPendingId = selectedTask.leadIds.find((lId) => {
      const res = selectedTask.callResults[lId];
      return !res || res.status === 'Pending';
    });
    if (!nextPendingId) {
      setAutoDialOn(false);
      return;
    }
    const lead = leadsDatabase.find((l) => l.id === nextPendingId);
    if (!lead) {
      setAutoDialOn(false);
      return;
    }
    const timer = setTimeout(() => dialLead(lead), 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDialOn, callState, selectedTask, leadsDatabase, selectedOutboundNumber, dialableNumbers.length]);

  // Kicks off the very first call the moment auto-dial is switched on
  // (the effect above only reacts to a call *finishing*) — otherwise
  // turning it on would just sit idle until you manually dialed once.
  // Picks a pending lead itself if none was already selected.
  useEffect(() => {
    if (!autoDialOn || callState !== 'idle' || !selectedTask) return;
    let lead = activeLead;
    if (!lead) {
      const nextPendingId = selectedTask.leadIds.find((lId) => {
        const res = selectedTask.callResults[lId];
        return !res || res.status === 'Pending';
      });
      lead = nextPendingId ? leadsDatabase.find((l) => l.id === nextPendingId) || null : null;
    }
    if (!lead) {
      setAutoDialOn(false);
      return;
    }
    const timer = setTimeout(() => dialLead(lead as Lead), 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDialOn]);

  if (playingTapeId && activeTapeResult) {
    const isOutbound = playingTapeType === 'outbound';
    const displayTitle = isOutbound && activeTapeLead
      ? `${activeTapeLead.name} Call Analysis`
      : `${activeTapeResult.leadName} Inbound Call Analysis`;

    const displaySubtitle = isOutbound
      ? `Campaign: ${selectedTask.name}`
      : `Caller: ${activeTapeResult.leadName} • Recorded ${new Date(activeTapeResult.createdAt).toLocaleString()}`;

    const filename = isOutbound && activeTapeLead
      ? `📼 ${activeTapeLead.name.toUpperCase()}_recording.wav`
      : `📼 ${String(activeTapeResult.leadName).toUpperCase()}_inbound_recording.wav`;

    return (
      <div id="voice-agent-dialer" className="p-6 md:p-8 space-y-6 overflow-y-auto h-screen w-full font-sans bg-[var(--bg-subtle)]/50 text-[var(--text-primary)] animate-fadeIn flex flex-col">
        {/* Navigation & Header with Compact Media Player */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border)]/80 rounded-2xl p-5 shadow-sm space-y-4 shrink-0 relative overflow-hidden">
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
            {/* Left: Info */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  setPlayingTapeId(null);
                  setIsTapePlaying(false);
                }}
                className="p-2.5 bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl hover:text-[var(--text-primary)] transition-all cursor-pointer flex items-center justify-center gap-2 font-medium" style={{ color: 'var(--text-secondary)' }}
              >
                <ArrowLeft className="h-4.5 w-4.5" />
                <span className="text-xs">Back</span>
              </button>
              <div className="h-8 w-[1px] bg-[var(--bg-subtle)] hidden sm:block"></div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-blue-600 uppercase tracking-widest font-bold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">Archive Room</span>
                  <span className="text-[9px] font-mono text-emerald-600 uppercase tracking-widest font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">{isOutbound ? 'Outbound Dial' : 'Inbound Line'}</span>
                </div>
                <h2 className="text-lg font-bold text-[var(--text-primary)] font-display mt-0.5">{displayTitle}</h2>
                <p className="text-[11px] text-[var(--text-muted)]">{displaySubtitle}</p>
              </div>
            </div>

            {/* MINIMAL HORIZONTAL RECORDING PLAYER — plays the real uploaded
                recording via activeTapeResult.recordingUrl; no recording
                means no playback, not a simulated animation. */}
            <div className="flex-1 max-w-2xl bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl p-3 flex items-center gap-4">
              {playableTapeRecordingUrl && (
                <audio
                  ref={audioElRef}
                  src={playableTapeRecordingUrl}
                  preload="metadata"
                  onLoadedMetadata={(e) => setTapeDuration(e.currentTarget.duration || 0)}
                  onTimeUpdate={(e) => {
                    const el = e.currentTarget;
                    if (el.duration) setTapeProgress((el.currentTime / el.duration) * 100);
                  }}
                  onEnded={() => {
                    setIsTapePlaying(false);
                    setTapeProgress(100);
                  }}
                  style={{ display: 'none' }}
                />
              )}

              {/* Play/Pause Button */}
              <button
                onClick={() => setIsTapePlaying(!isTapePlaying)}
                disabled={!playableTapeRecordingUrl}
                className="h-9 w-9 shrink-0 rounded-lg flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all cursor-pointer active:scale-95 shadow-md shadow-emerald-600/10"
                title={!playableTapeRecordingUrl ? 'No recording available' : isTapePlaying ? 'Pause Tape' : 'Play Tape'}
              >
                {isTapePlaying ? (
                  <Pause className="h-4 w-4 fill-white text-white" />
                ) : (
                  <Play className="h-4 w-4 fill-white text-white ml-0.5" />
                )}
              </button>

              {/* Progress & Label */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex justify-between items-center text-[10px] font-mono text-[var(--text-muted)]">
                  <span className="truncate font-semibold text-blue-600">{filename}</span>
                  <span className="shrink-0 font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {activeTapeResult.recordingUrl
                      ? `${formatTime(Math.round(((tapeDuration || activeTapeResult.duration) * tapeProgress) / 100))} / ${formatTime(Math.round(tapeDuration || activeTapeResult.duration))}`
                      : 'No recording available'}
                  </span>
                </div>
                <div className="relative h-1.5 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-1.5 transition-all" style={{ width: `${tapeProgress}%` }}></div>
                </div>
              </div>

              {/* Tape Reels Animation (Compact version) */}
              <div className="hidden sm:flex items-center space-x-2.5 px-2 bg-[var(--bg-subtle)] rounded-lg border border-[var(--border)] h-8">
                <div className="h-4 w-4 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] flex items-center justify-center">
                  <div className={`h-1.5 w-1.5 rounded-full bg-slate-500 ${isTapePlaying ? 'animate-spin' : ''}`} style={{ borderStyle: 'dashed' }}></div>
                </div>
                <div className="h-4 w-4 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] flex items-center justify-center">
                  <div className={`h-1.5 w-1.5 rounded-full bg-slate-500 ${isTapePlaying ? 'animate-spin' : ''}`} style={{ borderStyle: 'dashed' }}></div>
                </div>
              </div>

              {/* Play Speed selector */}
              <div className="flex border border-[var(--border)] bg-[var(--bg-surface)] rounded-lg overflow-hidden text-[10px] h-8 items-center">
                {[1, 1.5, 2].map((sp) => (
                  <button
                    key={sp}
                    onClick={() => setTapeSpeed(sp)}
                    className={`px-2 h-full font-mono font-bold ${tapeSpeed === sp ? 'bg-blue-600 text-white' : 'text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]'} cursor-pointer transition-all`}
                  >
                    {sp}x
                  </button>
                ))}
              </div>
            </div>

            {/* Cognitive Metrics */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="bg-[var(--bg-subtle)] border border-[var(--border)] px-3 py-1.5 rounded-xl text-center">
                <span className="text-[8px] font-mono text-[var(--text-muted)] uppercase tracking-wider block">Intent</span>
                <span className="text-xs font-bold text-blue-600">{activeTapeResult.intent}</span>
              </div>
              <div className="bg-[var(--bg-subtle)] border border-[var(--border)] px-3 py-1.5 rounded-xl text-center">
                <span className="text-[8px] font-mono text-[var(--text-muted)] uppercase tracking-wider block">Sentiment</span>
                <span className="text-xs font-bold text-emerald-600">{activeTapeResult.sentiment}</span>
              </div>
              <div className="bg-[var(--bg-subtle)] border border-[var(--border)] px-3 py-1.5 rounded-xl text-center">
                <span className="text-[8px] font-mono text-[var(--text-muted)] uppercase tracking-wider block">Cost</span>
                <span className="text-xs font-bold text-[var(--text-secondary)]">{formatInr(callCostInr(activeTapeResult.duration))}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Full-width Workspace: Wide Conversation Panel & Right Checklist Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
          
          {/* LEFT: Complete conversation dialogue timeline (FULL PAGE VIEW) */}
          <div className="lg:col-span-8 bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border)] flex flex-col h-full shadow-sm overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-4 shrink-0">
              <span className="text-xs font-mono text-[var(--text-secondary)] uppercase tracking-widest font-bold flex items-center gap-2">
                <MessageSquare className="h-4.5 w-4.5 text-blue-500 animate-pulse" />
                Conversation Dialogue Transcript
              </span>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">Dual-channel synthesis</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-5 pr-2">
              {activeTapeResult.transcript && activeTapeResult.transcript.length > 0 ? (
                activeTapeResult.transcript.map((line: any, idx: number) => {
                  const isAI = line.speaker === 'AI';
                  const speakerLabel = isAI
                    ? `🤖 AI ${agentDisplayName}`
                    : `👤 ${isOutbound && activeTapeLead ? activeTapeLead.name : activeTapeResult.leadName}`;
                  return (
                    <div key={idx} className="flex flex-col" style={{ alignItems: isAI ? 'flex-start' : 'flex-end' }}>
                      <div className="flex items-center space-x-1.5 mb-1.5 text-[9px] text-[var(--text-muted)] font-mono">
                        <span className="font-bold" style={{ color: 'var(--text-secondary)' }}>{speakerLabel}</span>
                        <span>•</span>
                        <span>{line.timestamp}</span>
                      </div>
                      <div
                        className={`max-w-[85%] rounded-2xl px-5 py-3 text-[13px] font-sans leading-relaxed shadow-sm border ${
                          isAI
                            ? 'bg-blue-50/70 text-[var(--text-primary)] rounded-tl-none border-blue-100/80'
                            : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] rounded-tr-none border-[var(--border)]'
                        }`}
                      >
                        {line.text}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-[var(--text-muted)] text-center py-12">No conversation script captured.</p>
              )}
            </div>
          </div>

          {/* RIGHT: Checklist & Extraction Dashboard */}
          <div className="lg:col-span-4 bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border)] flex flex-col h-full shadow-sm overflow-hidden">
            {/* AI Summary Section */}
            <div className="mb-4 shrink-0 bg-[var(--bg-subtle)] border border-[var(--border)]/60 rounded-xl p-4 space-y-1.5">
              <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-widest font-bold block">AI Summarized Intake</span>
              <p className="text-[var(--text-secondary)] leading-relaxed text-xs italic font-sans">
                "{activeTapeResult.summary}"
              </p>
            </div>

            {isOutbound ? (
              <>
                <span className="text-xs font-mono text-[var(--text-secondary)] uppercase tracking-widest font-bold pb-3 border-b border-[var(--border)] mb-4 flex items-center gap-2 shrink-0">
                  <Check className="h-4.5 w-4.5 text-emerald-500" />
                  Extracted Campaign Answers
                </span>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  {selectedTask.questions.map((question, qIdx) => {
                    const answer = activeTapeResult.answers?.[question];
                    return (
                      <div key={qIdx} className="p-4 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border)] space-y-2.5 transition-all hover:border-[var(--border)]/80">
                        <div className="flex items-start gap-2">
                          <span className="text-[9px] bg-[var(--bg-subtle)] px-2 py-0.5 rounded font-mono shrink-0 font-bold" style={{ color: 'var(--text-secondary)' }}>Q{qIdx + 1}</span>
                          <p className="font-medium text-xs leading-snug text-[var(--text-secondary)]">{question}</p>
                        </div>
                        <div className="bg-[var(--bg-surface)] border border-[var(--border)]/80 rounded-lg px-3.5 py-3 font-sans text-xs shadow-sm">
                          {answer ? (
                            <div className="text-emerald-600 flex items-start gap-2">
                              <span className="text-emerald-500 font-bold shrink-0 text-sm">✓</span>
                              <p className="text-[var(--text-primary)] italic leading-relaxed">"{answer}"</p>
                            </div>
                          ) : (
                            <span className="text-[var(--text-muted)] italic">No answer captured.</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl p-4 space-y-3 flex-1 overflow-y-auto">
                <span className="text-xs font-mono text-[var(--text-secondary)] uppercase tracking-widest font-bold block border-b border-[var(--border)] pb-2">Inbound Metadata</span>
                <div className="space-y-3.5 text-xs">
                  <div>
                    <span className="text-[var(--text-muted)] font-medium block">Caller Number</span>
                    <span className="font-mono font-bold text-[var(--text-secondary)] block mt-0.5">{activeTapeResult.leadName}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] font-medium block">Status</span>
                    <span className="font-semibold text-blue-600 block mt-0.5">{activeTapeResult.status}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] font-medium block">Call Duration</span>
                    <span className="font-mono text-[var(--text-secondary)] block mt-0.5">{activeTapeResult.duration} seconds</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] font-medium block">Recording Date</span>
                    <span className="font-mono text-[var(--text-secondary)] block mt-0.5">{new Date(activeTapeResult.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Quick speech suggestions based on active question
  const getSuggestionsForActiveQuestion = () => {
    if (activeQuestionIndex === 0) {
      return ["Yes, I definitely want to proceed!", "No, please cancel my request.", "I am in a bit of a rush."];
    }
    if (activeQuestionIndex === 1) {
      return ["I work full-time as a corporate employee", "I run my own business", "I earn around $6,000 every month"];
    }
    if (activeQuestionIndex === 2) {
      return ["My credit is excellent, around 750", "I have fair credit", "My credit score is close to 600"];
    }
    return ["Thank you, goodbye!", "When will you call me back?", "Yes, send me the links."];
  };

  // Quick calculation for task metrics — selectedTask is undefined when the
  // org has no dialing tasks yet (a real, valid state now that this is real
  // backend data instead of always-seeded fake tasks).
  const totalLeadsInTask = selectedTask?.leadIds.length || 0;
  const completedLeadsInTask = selectedTask ? Object.keys(selectedTask.callResults).map(k => selectedTask.callResults[k]).filter(r => r.status === 'Completed').length : 0;
  const skippedLeadsInTask = selectedTask ? Object.keys(selectedTask.callResults).map(k => selectedTask.callResults[k]).filter(r => r.status === 'Skipped').length : 0;
  const conversionPercent = selectedTask && completedLeadsInTask > 0
    ? Math.round((Object.keys(selectedTask.callResults).map(k => selectedTask.callResults[k]).filter(r => r.intent === 'Interested').length / completedLeadsInTask) * 100)
    : 0;

  return (
    <PageShell
      title="Voice Simulator"
      subtitle="Configure automated workflows, initiate sequential campaigns, or trigger dynamic incoming calls to your virtual phone lines."
      layout="fill"
      action={
        <div className="flex items-center gap-3">
          <div className="bg-[var(--bg-subtle)] p-1 rounded-xl border border-[var(--border)]/80 flex">
            <button
              onClick={() => setDialerMode('outbound')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dialerMode === 'outbound'
                  ? 'bg-[var(--bg-surface)] text-blue-600 shadow-sm border border-[var(--border)]/40'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <PhoneCall className="h-3.5 w-3.5" />
              <span>Outbound Campaigns</span>
            </button>
            <button
              onClick={() => setDialerMode('inbound')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer relative ${
                dialerMode === 'inbound'
                  ? 'bg-[var(--bg-surface)] text-blue-600 shadow-sm border border-[var(--border)]/40'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <PhoneIncoming className="h-3.5 w-3.5" />
              <span>Inbound Virtual Center</span>
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-duration-1000"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </button>
          </div>

          {dialerMode === 'outbound' && (
            <button
              onClick={openCreateTaskModal}
              className="flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/15 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Assign Dialing Task
            </button>
          )}
        </div>
      }
    >
      <div className="overflow-y-auto flex-1 px-8 pb-8 pt-6 space-y-6">

      {dialerMode === 'outbound' ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Today's Assigned Tasks list - Bento Card */}
        <div className="lg:col-span-4 bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border)] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center">
              <FileSpreadsheet className="h-4.5 w-4.5 mr-1.5 text-blue-600" /> Today's Assigned lists
            </h4>
            <span className="text-[10px] font-mono text-blue-600 bg-blue-50 font-bold px-2 py-0.5 rounded-full">
              {tasks.length} Active
            </span>
          </div>

          <p className="text-xs text-[var(--text-muted)]">Select an active call-list scheduled for today to monitor agent progress.</p>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {tasks.map((task) => {
              const isActive = task.id === selectedTaskId;
              const completed = Object.keys(task.callResults).map(k => task.callResults[k]).filter((r) => r.status === 'Completed').length;
              const total = task.leadIds.length;
              const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

              return (
                <button
                  key={task.id}
                  onClick={() => {
                    setSelectedTaskId(task.id);
                    setPlayingTapeId(null);
                    setIsTapePlaying(false);
                  }}
                  className={`w-full p-4 rounded-xl text-left border transition-all flex flex-col space-y-2.5 ${
                    isActive
                      ? 'border-blue-600 bg-blue-50/25 shadow-sm'
                      : 'border-[var(--border)] hover:bg-[var(--bg-subtle)]'
                  }`}
                >
                  <div className="flex justify-between items-start w-full gap-2">
                    <span className="text-xs font-bold text-[var(--text-primary)] line-clamp-1 flex-1">{task.name}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                      task.status === 'Completed'
                        ? 'bg-emerald-50 text-emerald-700'
                        : task.status === 'In Progress'
                        ? 'bg-blue-50 text-blue-700 animate-pulse'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                    }`}>
                      {task.status}
                    </span>
                  </div>

                  <div className="w-full space-y-1">
                    <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                      <span>Questions: {task.questions.length}</span>
                      <span>{completed}/{total} Dialed</span>
                    </div>
                    <div className="w-full bg-[var(--bg-subtle)] rounded-full h-1">
                      <div className="bg-blue-600 h-1 rounded-full transition-all" style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Stats Bento widget */}
          <div className="theme-panel rounded-xl p-4 space-y-2 relative overflow-hidden border">
            <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-blue-500/10 rounded-full blur-xl"></div>
            <div className="relative z-10 space-y-1">
              <span className={`text-[9px] font-mono uppercase tracking-wider font-bold ${autoDialOn ? 'text-emerald-500' : ''}`} style={!autoDialOn ? {color:'var(--panel-muted)'} : {}}>
                Calling Telemetry {autoDialOn && '· LIVE'}
              </span>
              <p className="text-lg font-bold" style={{color:'var(--panel-text)'}}>Continuous Dialer Mode: {autoDialOn ? 'ON' : 'OFF'}</p>
              <p className="text-[10px] leading-normal" style={{color:'var(--panel-muted)'}}>
                {autoDialOn
                  ? 'Auto-dialing every pending lead in the active list, one after another — hit "Stop Auto-Dial" to pause after the current call.'
                  : 'AI parses voice audio stream, converts caller speech to text in real-time, matching questionnaire patterns instantly. Click "Auto-Dial Next List Target" to work through the whole list without clicking Dial per lead.'}
              </p>
            </div>
          </div>
        </div>

        {/* Center Main Column: Selected Task Queue Workspace - Bento Card */}
        <div className="lg:col-span-8 bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border)] shadow-sm flex flex-col justify-between space-y-6">
          {!selectedTask ? (
            <EmptyState
              icon={FileSpreadsheet}
              heading="No dialing tasks yet"
              message="Assign a daily dialing task to start calling real leads."
              action={
                <Button variant="primary" size="sm" icon={Plus} onClick={openCreateTaskModal}>
                  Assign Dialing Task
                </Button>
              }
            />
          ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
              <div>
                <span className="text-[9px] font-mono text-blue-600 uppercase tracking-widest font-bold">Active Working List</span>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mt-0.5">{selectedTask.name}</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">Checklist questions to ask: <span className="font-semibold text-[var(--text-secondary)]">{selectedTask.questions.length} questions sequential</span></p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoDialOn((v) => !v)}
                  disabled={dialableNumbers.length === 0}
                  className={`flex items-center px-4 py-2 disabled:opacity-50 text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer ${
                    autoDialOn ? 'bg-rose-600 hover:bg-rose-500 text-white' : ''
                  }`}
                  style={!autoDialOn ? {background:'var(--panel-surface)',color:'var(--panel-text)',border:'1px solid var(--panel-border)'} : {}}
                  title={autoDialOn ? 'Stops after the current call finishes' : 'Dials the next pending lead now, then keeps going through the rest of the list automatically'}
                >
                  <PhoneCall className={`h-3.5 w-3.5 mr-1.5 ${autoDialOn ? '' : 'text-emerald-400'}`} />
                  {autoDialOn ? 'Stop Auto-Dial' : 'Auto-Dial Next List Target'}
                </button>
              </div>
            </div>

            {/* Micro bento statistics metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KpiCard colSpan={1} label="Targets Loaded" value={totalLeadsInTask} icon={FileSpreadsheet} iconPosition="right" iconBg="var(--bg-subtle)" iconColor="var(--text-muted)" className="!rounded-xl !min-h-0 !p-3.5" />
              <KpiCard colSpan={1} label="Recorded Dialed" value={completedLeadsInTask} icon={CheckCircle2} iconPosition="right" iconBg="var(--bg-subtle)" iconColor="var(--text-muted)" className="!rounded-xl !min-h-0 !p-3.5" />
              <KpiCard colSpan={1} label="Skipped/No Answer" value={skippedLeadsInTask} icon={XCircle} iconPosition="right" iconBg="var(--bg-subtle)" iconColor="var(--text-muted)" className="!rounded-xl !min-h-0 !p-3.5" />
              <KpiCard colSpan={1} label="Conversion Rate" value={`${conversionPercent}%`} icon={Activity} iconPosition="right" iconBg="var(--bg-subtle)" iconColor="#059669" className="!rounded-xl !min-h-0 !p-3.5" />
            </div>

            {/* List Queue Table */}
            <div className="border border-[var(--border)] rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[var(--bg-subtle)] border-b border-[var(--border)] text-[var(--text-muted)]">
                    <th className="px-4 py-2.5 font-semibold">Lead Contact</th>
                    <th className="px-4 py-2.5 font-semibold">Value</th>
                    <th className="px-4 py-2.5 font-semibold">Survey Status</th>
                    <th className="px-4 py-2.5 font-semibold">AI Sentiment</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Survey Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedTask.leadIds.map((leadId) => {
                    const lead = leadsDatabase.find((l) => l.id === leadId);
                    if (!lead) return null;

                    const result = selectedTask.callResults[leadId];
                    const isCallingActive = activeLead?.id === leadId && (callState === 'dialing' || callState === 'connected');

                    return (
                      <tr key={leadId} className={`hover:bg-[var(--bg-subtle)]/50 transition-colors ${isCallingActive ? 'bg-blue-50/30' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            <p className="font-bold text-[var(--text-primary)]">{lead.name}</p>
                            <p className="text-[10px] text-[var(--text-muted)] font-mono">{lead.phone}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-secondary)' }}>
                          {lead.amountRequested ? `$${lead.amountRequested.toLocaleString()}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {isCallingActive ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md animate-pulse border border-blue-100">
                              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
                              Call Active
                            </span>
                          ) : result ? (
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              result.status === 'Completed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : result.status === 'Skipped'
                                ? 'bg-[var(--bg-subtle)] text-slate-600'
                                : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                            }`}>
                              {result.status}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--text-muted)] bg-[var(--bg-subtle)] px-2 py-0.5 rounded-md">
                              Pending Dial
                            </span>
                          )}
                          {(() => {
                            const retry = retryStatuses[normalizePhone(lead.phone)];
                            if (!retry || isCallingActive) return null;
                            if (retry.retryStatus === 'exhausted') {
                              return (
                                <p className="text-[9px] text-[var(--text-muted)] mt-1">
                                  Auto-redial gave up after {retry.attemptNumber}/3 attempts
                                </p>
                              );
                            }
                            if (retry.retryStatus === 'pending' && retry.nextRetryAt) {
                              const mins = Math.max(0, Math.round((new Date(retry.nextRetryAt).getTime() - Date.now()) / 60000));
                              const label = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
                              return (
                                <p className="text-[9px] text-blue-500 mt-1">
                                  Auto-redial {retry.attemptNumber}/3 · next in {label}
                                </p>
                              );
                            }
                            if (retry.retryStatus === 'retrying') {
                              return <p className="text-[9px] text-blue-500 mt-1 animate-pulse">Auto-redialing…</p>;
                            }
                            return null;
                          })()}
                        </td>
                        <td className="px-4 py-3">
                          {result?.sentiment ? (
                            <span className={`text-[10px] font-semibold ${
                              result.sentiment === 'Positive'
                                ? 'text-emerald-600'
                                : result.sentiment === 'Negative'
                                ? 'text-rose-600'
                                : 'text-[var(--text-muted)]'
                            }`}>
                              {result.sentiment}
                            </span>
                          ) : (
                            <span className="text-[10px] text-[var(--text-muted)]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {!result ? (
                              <>
                                <button
                                  onClick={() => handleSkipLead(leadId)}
                                  disabled={callState === 'dialing' || callState === 'connected'}
                                  className="text-[10px] font-semibold text-[var(--text-muted)] hover:text-slate-600 px-2 py-1 rounded hover:bg-[var(--bg-subtle)] cursor-pointer"
                                >
                                  Skip
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveLead(lead);
                                    setCallState('idle');
                                  }}
                                  disabled={callState === 'dialing' || callState === 'connected'}
                                  className="text-[10px] font-bold text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 hover:border-blue-600 px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <PhoneCall className="h-3 w-3" /> Dial
                                </button>
                              </>
                            ) : result.status === 'Completed' ? (
                              <button
                                onClick={() => handleOpenTapePlayer(leadId)}
                                className="text-[10px] font-bold text-[var(--text-secondary)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle)] px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <Headphones className="h-3.5 w-3.5 text-blue-600" /> Play Recording
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setActiveLead(lead);
                                  setCallState('idle');
                                }}
                                className="text-[10px] font-medium text-blue-600 hover:underline cursor-pointer"
                              >
                                Redial
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Two columns workspace: Live Active Telephone Screen AND Call Cassette Tape Transcript History Player */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Active Telephone Simulator Frame */}
        <div className="lg:col-span-6 theme-panel rounded-2xl p-6 border shadow-xl space-y-5">
          <div className="flex justify-between items-center border-b border-white/5 pb-3">
            <div className="flex items-center space-x-2">
              <Disc className={`h-4.5 w-4.5 text-blue-400 ${callState === 'connected' ? 'animate-spin' : ''}`} />
              <span className="text-xs font-mono text-blue-300 font-bold uppercase tracking-widest">AI Call Simulator Screen</span>
            </div>
            {callState === 'connected' ? (
              <span className="text-[10px] font-mono text-red-400 font-bold flex items-center gap-1 bg-red-950/40 border border-red-900/40 px-2 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></span>
                🔴 REC AUDIO ACTIVE
              </span>
            ) : (
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest font-bold">Line Standing By</span>
            )}
          </div>

          {activeLead ? (
            <div className="space-y-4">
              {/* Active Call details */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/5 p-4 rounded-xl border border-white/5 gap-2">
                <div>
                  <h5 className="text-xs text-[var(--text-muted)] font-mono">CALLEE TARGET</h5>
                  <p className="text-sm font-bold text-slate-100 font-display mt-0.5">{activeLead.name}</p>
                  <p className="text-[10px] text-blue-300 font-mono mt-0.5">{activeLead.phone}{activeLead.amountRequested ? ` • value $${activeLead.amountRequested.toLocaleString()}` : ''}</p>
                </div>
                <div className="text-right shrink-0">
                  <h5 className="text-xs text-[var(--text-muted)] font-mono">DIAL TIMER</h5>
                  <p className="text-md font-mono font-bold text-slate-100 mt-0.5">
                    {callState === 'connected' ? formatTime(duration) : '00:00'}
                  </p>
                </div>
              </div>

              {/* Questionnaire Progress checklist inside phone hud */}
              <div className="theme-panel-surface border rounded-xl p-4 space-y-2.5" style={{borderColor:'var(--panel-border)'}}>
                <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase font-bold tracking-wider block">Questionnaire Steps asked by AI:</span>
                <div className="space-y-1.5 text-[11px]">
                  {selectedTask.questions.map((q, idx) => {
                    const isAsked = idx < activeQuestionIndex;
                    const isCurrent = idx === activeQuestionIndex && callState === 'connected';

                    return (
                      <div key={idx} className={`flex items-start gap-2 p-1.5 rounded ${
                        isCurrent ? 'bg-blue-900/30 border border-blue-800/40' : 'opacity-60'
                      }`}>
                        {isAsked ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : isCurrent ? (
                          <span className="h-4 w-4 rounded-full border border-blue-400 flex items-center justify-center text-[10px] text-blue-300 font-bold animate-pulse shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                        ) : (
                          <span className="h-4 w-4 rounded-full border border-slate-700 flex items-center justify-center text-[10px] text-[var(--text-muted)] shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                        )}
                        <p className={`leading-relaxed ${isCurrent ? 'font-bold text-slate-100' : 'text-slate-300'}`}>{q}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Call Control Action buttons */}
              <div className="flex items-center justify-center pt-2">
                {callState === 'idle' && (
                  <div className="text-center py-4 space-y-3">
                    <div className="h-12 w-12 bg-blue-600/10 border border-blue-500/20 rounded-full flex items-center justify-center text-blue-400 mx-auto">
                      <PhoneCall className="h-6 w-6" />
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">Selected target ready for outbound dial. Initiate line now.</p>
                    {dialableNumbers.length > 0 ? (
                      <div className="flex flex-col items-center gap-2">
                        <select
                          value={selectedOutboundNumber}
                          onChange={(e) => setSelectedOutboundNumber(e.target.value)}
                          className="rounded-lg px-3 py-1.5 text-xs focus:outline-none" style={{background:'var(--panel-surface)',border:'1px solid var(--panel-border)',color:'var(--panel-text)'}}
                        >
                          {dialableNumbers.map((n) => (
                            <option key={n.number} value={n.number}>
                              {n.friendlyName ? `${n.friendlyName} — ` : ''}{n.number} ({n.provider})
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => dialLead(activeLead)}
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                        >
                          Dial
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-rose-400">No Twilio or Vobiz.ai number provisioned yet — add one in Settings &gt; Numbers before dialing.</p>
                    )}
                  </div>
                )}

                {callState === 'dialing' && (
                  <div className="text-center py-4 space-y-3">
                    <div className="h-12 w-12 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center text-amber-400 animate-ping mx-auto">
                      <Volume2 className="h-6 w-6" />
                    </div>
                    <p className="text-xs text-amber-400 font-mono">Securing carrier trunk line...</p>
                    <button
                      onClick={() => setCallState('idle')}
                      className="px-4 py-1.5 bg-rose-600 text-white text-[10px] font-bold rounded-lg cursor-pointer"
                    >
                      Cancel Outbound Connection
                    </button>
                  </div>
                )}

                {callState === 'connected' && (
                  <button
                    onClick={vobizCallSid ? handleHangupVobizCall : (twilioCallSid ? handleHangupTwilioCall : handleHangupCall)}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-lg"
                  >
                    <PhoneOff className="h-4.5 w-4.5 mr-2" /> Disconnect Call (Finish & Save Recording)
                  </button>
                )}

                {callState === 'completed' && (
                  <div className="text-center py-4 space-y-3">
                    <div className="h-12 w-12 bg-emerald-600/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 mx-auto">
                      <ThumbsUp className="h-6 w-6" />
                    </div>
                    <p className="text-xs text-slate-200 font-semibold">Call successfully finished & saved to tape recorder!</p>
                    <p className="text-[10px] text-[var(--text-muted)]">Speech transcript has been parsed and answers extracted.</p>
                    <button
                      onClick={() => setCallState('idle')}
                      className="px-4 py-1.5 bg-white/10 hover:bg-white/15 text-xs rounded-lg cursor-pointer text-white"
                    >
                      Ready Next Dial
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-[var(--text-muted)] space-y-2">
              <PhoneCall className="h-8 w-8 animate-pulse" style={{ color: 'var(--text-secondary)' }} />
              <p className="text-xs text-[var(--text-muted)]">No active connection. Choose a target from the list above and click "Dial" to start.</p>
            </div>
          )}
        </div>

        {/* Live Active Transcript / Simulation Speech Feed */}
        <div className="lg:col-span-6 theme-panel rounded-2xl border shadow-xl flex flex-col h-[400px]">
          <div className="p-4 border-b theme-panel-surface flex items-center justify-between" style={{borderColor:'var(--panel-border)'}}>
            <span className="text-xs font-mono text-blue-400 uppercase tracking-widest flex items-center">
              <MessageSquare className="h-4.5 w-4.5 mr-2" /> Active Dialogue feed
            </span>
            <div className="flex items-center space-x-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] font-mono text-emerald-400 font-semibold uppercase tracking-wider">AUDIO STREAM PARSING</span>
            </div>
          </div>

          {/* Transcript bubbles */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {transcript.length > 0 ? (
              transcript.map((line, idx) => {
                const isAI = line.speaker === 'AI';
                return (
                  <div key={idx} className={`flex flex-col ${isAI ? 'items-start' : 'items-end'}`}>
                    <span className="text-[9px] text-[var(--text-muted)] font-mono mb-1">{line.speaker} • {line.timestamp}</span>
                    <div
                      className={`rounded-2xl px-4 py-2 text-xs font-sans leading-relaxed ${
                        isAI
                          ? 'bg-blue-900 text-blue-50 rounded-tl-none'
                          : 'bg-slate-800 text-slate-200 rounded-tr-none border border-slate-700/50'
                      }`}
                    >
                      {line.text}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] space-y-2">
                <Mic className="h-8 w-8 text-slate-600 animate-pulse" />
                <p className="text-xs text-[var(--text-muted)]">Awaiting telephone call connection to parse audio waves...</p>
              </div>
            )}

            {isAiResponding && (
              <div className="flex flex-col items-start">
                <span className="text-[9px] text-[var(--text-muted)] font-mono mb-1">AI {agentDisplayName} • Thinking</span>
                <div className="bg-blue-950/50 border border-blue-900/40 text-blue-300 rounded-2xl rounded-tl-none px-4 py-2 flex items-center space-x-2 text-xs">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>AI Agent {agentDisplayName} is evaluating customer utterance...</span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef}></div>
          </div>

          {/* Caller Interactive Speech Simulation pad */}
          {callState === 'connected' && (
            <div className="p-3 border-t theme-panel-surface space-y-2.5" style={{borderColor:'var(--panel-border)'}}>
              {/* Quick simulation helper response chips */}
              <div className="flex flex-wrap gap-1.5">
                {getSuggestionsForActiveQuestion().map((suggestion, sIdx) => (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => {
                      setCustomerUtterance(suggestion);
                      handleSendUtterance(suggestion);
                    }}
                    className="text-[10px] bg-slate-800 hover:bg-blue-900 hover:text-white text-slate-300 border border-slate-700/60 rounded px-2.5 py-1 transition-all cursor-pointer"
                  >
                    🎤 Say: "{suggestion}"
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendUtterance(customerUtterance);
                }}
                className="flex items-center space-x-2"
              >
                <input
                  type="text"
                  value={customerUtterance}
                  onChange={(e) => setCustomerUtterance(e.target.value)}
                  placeholder="Type customer reply here..."
                  className="flex-1 rounded-xl px-3.5 py-2.5 text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" style={{background:'var(--panel-surface)',border:'1px solid var(--panel-border)',color:'var(--panel-text)'}}
                />
                <button
                  type="submit"
                  className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
        </>
      ) : (
        /* REAL INBOUND CALL HISTORY */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Active Inbound Virtual Numbers */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border)] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-1.5">
                  <PhoneForwarded className="h-4.5 w-4.5 text-blue-600 animate-pulse" /> Active Inbound Numbers
                </h4>
                <span className="text-[10px] font-mono text-blue-600 bg-blue-50 font-bold px-2 py-0.5 rounded-full">
                  {activeVirtualNumbers.length} Online
                </span>
              </div>

              <div className="space-y-3.5">
                {activeVirtualNumbers.map((vNum) => (
                  <div
                    key={vNum.id}
                    className="w-full p-4 rounded-xl text-left border border-[var(--border)] flex flex-col space-y-2"
                  >
                    <div className="flex justify-between items-start w-full gap-2">
                      <span className="text-xs font-bold text-[var(--text-primary)] font-mono">{vNum.number}</span>
                      <span className="text-[8px] font-mono font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        {vNum.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] font-medium truncate">{vNum.friendlyName}</div>
                    <div className="flex justify-between text-[9px] font-mono text-[var(--text-muted)] border-t border-[var(--border)] pt-1.5">
                      <span>Inbound Logs: {vNum.incomingCallCount}</span>
                      <span>Carrier: {vNum.provider}</span>
                    </div>
                  </div>
                ))}
                {activeVirtualNumbers.length === 0 && (
                  <div className="text-center py-8 border border-dashed border-[var(--border)] rounded-xl bg-[var(--bg-subtle)]/50 space-y-2">
                    <PhoneForwarded className="h-6 w-6 text-slate-300 mx-auto" />
                    <p className="text-[11px] text-[var(--text-muted)]">No virtual numbers connected yet. Add one under Settings to start receiving real inbound calls.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="theme-panel p-4 rounded-2xl border relative overflow-hidden shrink-0">
              <div className="absolute right-0 bottom-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
              <div className="relative z-10 flex items-center space-x-3 text-xs leading-normal">
                <Sparkles className="h-5 w-5 text-emerald-400 shrink-0" />
                <p className="text-[11px]" style={{color:'var(--panel-muted)'}}>
                  Real calls to any connected number above are answered live by <strong style={{color:'var(--panel-text)'}}>{agentDisplayName}</strong>, transcribed, and logged here automatically — nothing on this tab is simulated.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Real Inbound Call History */}
          <div className="lg:col-span-8 flex flex-col h-full space-y-6">
            <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border)] shadow-sm flex flex-col justify-between h-full min-h-[580px] space-y-6">
              <div className="space-y-4">
                {/* Stats banner */}
                <div className="grid grid-cols-3 gap-4 border-b border-[var(--border)] pb-5">
                  <div className="p-3 bg-[var(--bg-subtle)] border border-[var(--border)]/50 rounded-xl space-y-1 text-center">
                    <span className="text-[8px] font-mono text-[var(--text-muted)] uppercase tracking-widest block">Inbound Volume</span>
                    <p className="text-xl font-bold text-[var(--text-primary)]">{realInboundCallLogs.length}</p>
                  </div>
                  <div className="p-3 bg-[var(--bg-subtle)] border border-[var(--border)]/50 rounded-xl space-y-1 text-center">
                    <span className="text-[8px] font-mono text-[var(--text-muted)] uppercase tracking-widest block">Average Duration</span>
                    <p className="text-xl font-bold text-[var(--text-primary)]">
                      {realInboundCallLogs.length > 0
                        ? Math.round(realInboundCallLogs.reduce((acc, l) => acc + l.duration, 0) / realInboundCallLogs.length)
                        : 0}s
                    </p>
                  </div>
                  <div className="p-3 bg-[var(--bg-subtle)] border border-[var(--border)]/50 rounded-xl space-y-1 text-center">
                    <span className="text-[8px] font-mono text-[var(--text-muted)] uppercase tracking-widest block">Positive Rate</span>
                    <p className="text-xl font-bold text-[var(--text-primary)]">
                      {realInboundCallLogs.length > 0
                        ? Math.round((realInboundCallLogs.filter(l => l.sentiment === 'Positive').length / realInboundCallLogs.length) * 100)
                        : 0}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-1.5">
                      <History className="h-4.5 w-4.5 text-blue-600" /> Inbound Dialogue History
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">Real recorded calls answered on your virtual numbers, with AI-extracted summaries and full transcripts.</p>
                  </div>
                </div>

                {/* Logs list */}
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {realInboundCallLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-4 border border-[var(--border)] rounded-xl bg-[var(--bg-subtle)]/50 hover:bg-[var(--bg-subtle)] transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                    >
                      <div className="space-y-1.5 max-w-lg">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-[var(--text-primary)] font-mono">{log.leadName}</span>
                          <span className="text-[9px] font-mono text-[var(--text-muted)]">•</span>
                          <span className="text-[9px] font-mono text-[var(--text-muted)]">{new Date(log.createdAt).toLocaleString()}</span>
                        </div>

                        <p className="text-[11px] italic font-medium leading-relaxed font-sans line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                          "{log.summary}"
                        </p>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="text-[9px] font-mono text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                            {log.sentiment}
                          </span>
                          <span className="text-[9px] font-mono text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">
                            {log.status}
                          </span>
                          <span className="text-[9px] font-mono text-[var(--text-muted)] bg-[var(--bg-subtle)] px-1.5 py-0.5 rounded-full">
                            Duration: {log.duration}s
                          </span>
                          <span className="text-[9px] font-mono text-[var(--text-muted)] bg-[var(--bg-subtle)] px-1.5 py-0.5 rounded-full">
                            {formatInr(callCostInr(log.duration))}
                          </span>
                        </div>
                      </div>

                      {/* Tape playback button */}
                      <button
                        onClick={() => handleOpenTapePlayer(log.id, 'inbound')}
                        className="px-3.5 py-2 bg-[var(--bg-surface)] hover:bg-blue-600 hover:text-white text-[var(--text-secondary)] border border-[var(--border)] hover:border-blue-600 rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all flex items-center gap-1 shrink-0"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        Play Tape
                      </button>
                    </div>
                  ))}

                  {realInboundCallLogs.length === 0 && (
                    <div className="text-center py-12 border border-dashed border-[var(--border)] rounded-xl bg-[var(--bg-subtle)]/50 space-y-2">
                      <Inbox className="h-8 w-8 text-[var(--text-muted)] mx-auto" />
                      <p className="text-xs text-[var(--text-muted)] font-medium">No inbound calls logged yet.</p>
                      <p className="text-[10px] text-[var(--text-muted)]">Real calls to a connected virtual number will appear here automatically as they happen.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Information badge footer */}
              <div className="theme-panel p-4 rounded-2xl border relative overflow-hidden shrink-0 mt-4">
                <div className="absolute right-0 bottom-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
                <div className="relative z-10 flex items-center space-x-3 text-xs leading-normal">
                  <Sparkles className="h-5 w-5 text-emerald-400 shrink-0" />
                  <p className="text-[11px]" style={{color:'var(--panel-muted)'}}>
                    Our virtual number routing maps inbound SIP audio streaming directly to the <strong style={{color:'var(--panel-text)'}}>{agentDisplayName} CRM Intelligence engine</strong>, recording and parsing customer responses in real time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
      {/* MODAL: Assign New Daily Dialing Task */}
      {showCreateModal && (
        <Modal
          open
          onClose={() => setShowCreateModal(false)}
          title="Assign Daily Outbound Dialing Task"
          subtitle="Set up list criteria, type specific sequential questions, and activate call audio recording."
          maxWidth="max-w-3xl"
        >
            <form onSubmit={handleCreateTask} className="space-y-5">
              {/* Task Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold block" style={{ color: 'var(--text-secondary)' }}>Task Name / Campaign Theme</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Daily Pre-Qualification Callback List"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  className="w-full border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Language + assigned team member */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold block" style={{ color: 'var(--text-secondary)' }}>Call Language</label>
                  <select
                    value={newTaskLanguage}
                    onChange={(e) => setNewTaskLanguage(e.target.value)}
                    className="w-full border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    {TASK_LANGUAGE_OPTIONS.map((lang) => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                  {newTaskLanguage !== DEFAULT_TASK_LANGUAGE && (
                    <p className="text-[10px] text-amber-600">
                      Non-default languages use a generic fluency instruction — voice naturalness won't yet match the hand-tuned Tamil default.
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold block" style={{ color: 'var(--text-secondary)' }}>Assign to Team Member</label>
                  <select
                    value={newTaskAssignedMemberId}
                    onChange={(e) => setNewTaskAssignedMemberId(e.target.value)}
                    className="w-full border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">None — no callback contact shared</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}{m.phone ? ` (${m.phone})` : ' (no phone on file)'}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Star Health quoting toggle — insurance-only, opt-in per task */}
              {isInsurance && (
                <div className="flex items-start gap-2 border border-[var(--border)] rounded-xl px-4 py-2.5">
                  <input
                    type="checkbox"
                    id="starhealth-enabled"
                    checked={newStarhealthEnabled}
                    onChange={(e) => setNewStarhealthEnabled(e.target.checked)}
                    className="mt-0.5"
                  />
                  <label htmlFor="starhealth-enabled" className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <span className="font-bold text-[var(--text-secondary)] block">Enable Star Health quoting</span>
                    During this task's calls, the AI will collect quote details (pincode, family, ages, pre-existing disease) and read back a live Star Health quote, or send it afterward if it isn't ready during the call.
                  </label>
                </div>
              )}

              {/* Define Questions sequential flow */}
              <div className="space-y-2">
                <label className="text-xs font-bold block" style={{ color: 'var(--text-secondary)' }}>Questions Questionnaire (Sequential Flow)</label>
                <p className="text-[11px] text-[var(--text-muted)] leading-normal">
                  Our virtual voice assistant, {agentDisplayName}, will ask these questions one by one. It automatically processes the caller speech, records the timeline, and advances to the next question.
                </p>

                {tasks.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => {
                      const sourceTask = tasks.find((t) => t.id === e.target.value);
                      if (sourceTask) setNewQuestions([...sourceTask.questions]);
                    }}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500" style={{ color: 'var(--text-secondary)' }}
                  >
                    <option value="">Copy questions from an existing task…</option>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.questions.length} question{t.questions.length === 1 ? '' : 's'})</option>
                    ))}
                  </select>
                )}

                {isInsurance && (
                  <button
                    type="button"
                    onClick={() => setNewQuestions([...SUPER_STAR_QUESTIONS])}
                    className="w-full flex items-center justify-center gap-1.5 border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded-lg px-3 py-2 cursor-pointer"
                  >
                    ⭐ Load Super Star Questions ({SUPER_STAR_QUESTIONS.length} questions)
                  </button>
                )}

                {/* Question List */}
                <div className="space-y-2 max-h-32 overflow-y-auto bg-[var(--bg-subtle)] p-3 rounded-xl border border-[var(--border)]">
                  {newQuestions.map((q, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 bg-[var(--bg-surface)] px-3 py-1.5 rounded-lg border border-[var(--border)]">
                      <span className="text-[10px] font-mono text-[var(--text-muted)] shrink-0">Q{idx + 1}:</span>
                      <p className="text-xs text-[var(--text-secondary)] truncate flex-1 font-medium">{q}</p>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(idx)}
                        className="text-[10px] text-rose-500 font-bold hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {newQuestions.length === 0 && (
                    <p className="text-xs text-[var(--text-muted)] italic text-center py-2">No questions defined yet. Please add at least one question below.</p>
                  )}
                </div>

                {/* Add Question row */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a new survey question (e.g., Do you currently rent or own?)"
                    value={tempQuestionInput}
                    onChange={(e) => setTempQuestionInput(e.target.value)}
                    className="flex-1 border border-[var(--border)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)]"
                  />
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="px-4 py-2 text-xs font-bold rounded-xl cursor-pointer shrink-0" style={{background:'var(--panel-bg)',color:'var(--panel-text)',border:'1px solid var(--panel-border)'}}
                  >
                    Add Question
                  </button>
                </div>
              </div>

              {/* Select Leads checklist */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold block" style={{ color: 'var(--text-secondary)' }}>Select Target Numbers / Leads ({selectedFormLeadIds.length} chosen)</label>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        const filtered = leadsDatabase.filter((lead) => {
                          const query = modalLeadSearch.toLowerCase();
                          return lead.name.toLowerCase().includes(query) || lead.phone.includes(query) || lead.source.toLowerCase().includes(query);
                        }).map((l) => l.id);
                        setSelectedFormLeadIds(Array.from(new Set([...selectedFormLeadIds, ...filtered])));
                      }}
                      className="text-[10px] text-blue-600 font-semibold hover:underline cursor-pointer"
                    >
                      Select All Filtered
                    </button>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedFormLeadIds([])}
                      className="text-[10px] text-[var(--text-muted)] font-semibold hover:underline cursor-pointer"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {/* Search filter for task creation */}
                <SearchInput
                  value={modalLeadSearch}
                  onChange={setModalLeadSearch}
                  placeholder="Filter contacts by name, phone or source (e.g., CSV Bulk Upload)..."
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-36 overflow-y-auto bg-[var(--bg-subtle)] p-3 rounded-xl border border-[var(--border)]">
                  {leadsDatabase
                    .filter((lead) => {
                      const query = modalLeadSearch.toLowerCase();
                      return lead.name.toLowerCase().includes(query) || lead.phone.includes(query) || lead.source.toLowerCase().includes(query);
                    })
                    .map((lead) => {
                      const isChecked = selectedFormLeadIds.includes(lead.id);
                      return (
                        <button
                          type="button"
                          key={lead.id}
                          onClick={() => handleToggleLeadSelection(lead.id)}
                          className={`p-2.5 rounded-xl text-left border transition-all flex items-center justify-between cursor-pointer ${
                            isChecked
                              ? 'border-blue-600 bg-blue-50/45 shadow-sm'
                              : 'border-white bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)]'
                          }`}
                        >
                          <div className="space-y-0.5 truncate max-w-[180px]">
                            <p className="text-xs font-bold text-[var(--text-primary)] truncate">{lead.name}</p>
                            <p className="text-[10px] text-[var(--text-muted)] font-mono truncate">{lead.phone} • {lead.source}</p>
                          </div>
                          <div className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center shrink-0 ${
                            isChecked ? 'border-blue-600 bg-blue-600 text-white' : 'border-[var(--border)] bg-[var(--bg-surface)]'
                          }`}>
                            {isChecked && <Check className="h-3 w-3" />}
                          </div>
                        </button>
                      );
                    })}
                  {leadsDatabase.filter((lead) => {
                    const query = modalLeadSearch.toLowerCase();
                    return lead.name.toLowerCase().includes(query) || lead.phone.includes(query) || lead.source.toLowerCase().includes(query);
                  }).length === 0 && (
                    <p className="text-xs text-[var(--text-muted)] italic text-center col-span-2 py-4">No contacts match the filter query.</p>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-secondary)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle)] rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl cursor-pointer"
                >
                  Create & Load Dialing Task
                </button>
              </div>
            </form>
        </Modal>
      )}

    </PageShell>
  );
}
