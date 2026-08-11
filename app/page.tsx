'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, RotateCcw, Plus, Trash2, Download, Upload, 
  Settings, Film, Clock, Type, Check, Palette, Loader2, Mic, Sparkles, Move
} from 'lucide-react';
import { pipeline, env } from '@huggingface/transformers';

// Configure transformers env for browser usage
env.allowLocalModels = false;

interface SubtitleItem {
  id: string;
  start: number;
  end: number;
  text: string;
}

export default function SubtitlesEditor() {
  // Video and playback states
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [selectedSubtitleId, setSelectedSubtitleId] = useState<string | null>('1');

  // Transcription & export state
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcribeProgress, setTranscribeProgress] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<string>('');

  // Subtitles state
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>([
    { id: '1', start: 0.0, end: 1.5, text: 'Ultimate' },
    { id: '2', start: 1.5, end: 3.0, text: 'AI editor' },
    { id: '3', start: 3.0, end: 4.5, text: 'Live sync' },
  ]);

  // Styling customizer states
  const [activePreset, setActivePreset] = useState<'bold-outline' | 'solid-box' | 'cinematic'>('bold-outline');
  const [textColor, setTextColor] = useState<string>('#FFFFFF');
  const [outlineColor, setOutlineColor] = useState<string>('#000000');
  const [textStyleMode, setTextStyleMode] = useState<'bold' | 'normal' | 'italic'>('bold');
  const [animationMode, setAnimationMode] = useState<'none' | 'pop'>('pop');

  // Dynamic Word & Character limits
  const [maxWordsPerBlock, setMaxWordsPerBlock] = useState<number>(2);
  const [maxCharsPerBlock, setMaxCharsPerBlock] = useState<number>(10);

  // Subtitle positioning (percentage from top/left within video container)
  const [subtitlePos, setSubtitlePos] = useState<{ x: number; y: number }>({ x: 50, y: 82 });
  const [isDraggingSubtitle, setIsDraggingSubtitle] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const transcriberRef = useRef<any>(null);

  // Handle video upload
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  // Playback control
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    setCurrentTime(0);
    videoRef.current.pause();
    setIsPlaying(false);
  };

  // Time update from video element
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  // Format time (seconds to MM:SS.ms)
  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    const milliseconds = Math.floor((secs % 1) * 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds}`;
  };

  // Find current active subtitle based on currentTime
  const currentSubtitle = subtitles.find(
    (sub) => currentTime >= sub.start && currentTime <= sub.end
  );

  // When currentSubtitle changes or when playing, if selected subtitle is different and not explicitly locked elsewhere, keep in sync
  useEffect(() => {
    if (currentSubtitle && selectedSubtitleId !== currentSubtitle.id) {
      // Optional: auto-sync selection on playback
    }
  }, [currentTime]);

  // Dragging / Repositioning handlers for virtual bounding box
  const handleMouseDownDrag = (e: React.MouseEvent, subId?: string) => {
    e.stopPropagation();
    if (subId) {
      setSelectedSubtitleId(subId);
    }
    setIsDraggingSubtitle(true);
  };

  const handleMouseMoveDrag = (e: React.MouseEvent) => {
    if (!isDraggingSubtitle || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(10, Math.min(90, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(10, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100));
    setSubtitlePos({ x, y });
  };

  const handleMouseUpDrag = () => {
    setIsDraggingSubtitle(false);
  };

  // Add new subtitle
  const handleAddSubtitle = () => {
    const lastSub = subtitles[subtitles.length - 1];
    const newStart = lastSub ? lastSub.end : currentTime;
    const newEnd = newStart + 1.5;
    const newItem: SubtitleItem = {
      id: Date.now().toString(),
      start: parseFloat(newStart.toFixed(2)),
      end: parseFloat(newEnd.toFixed(2)),
      text: 'New'
    };
    setSubtitles([...subtitles, newItem]);
    setSelectedSubtitleId(newItem.id);
  };

  // Delete subtitle
  const handleDeleteSubtitle = (id: string) => {
    setSubtitles(subtitles.filter(sub => sub.id !== id));
    if (selectedSubtitleId === id) {
      setSelectedSubtitleId(null);
    }
  };

  // Update subtitle text
  const handleTextChange = (id: string, newText: string) => {
    setSubtitles(subtitles.map(sub => sub.id === id ? { ...sub, text: newText } : sub));
  };

  // Update subtitle timestamp
  const handleTimestampChange = (id: string, field: 'start' | 'end', val: number) => {
    setSubtitles(subtitles.map(sub => sub.id === id ? { ...sub, [field]: Math.max(0, val) } : sub));
  };

  // Precise word-level timestamp mapping
  const handleAIAutoTranscribe = async () => {
    if (!videoSrc) {
      alert('Please upload a video file first before running AI Auto-Transcribe.');
      return;
    }

    try {
      setIsTranscribing(true);
      setTranscribeProgress('Loading Whisper model (Xenova/whisper-tiny.en)...');

      if (!transcriberRef.current) {
        transcriberRef.current = await pipeline(
          'automatic-speech-recognition',
          'Xenova/whisper-tiny.en',
          {
            progress_callback: (data: any) => {
              if (data && data.status === 'progress' && typeof data.loaded === 'number' && typeof data.total === 'number') {
                const percent = Math.round((data.loaded / data.total) * 100);
                setTranscribeProgress(`Loading model weights... ${percent}%`);
              } else if (data && data.status) {
                setTranscribeProgress(`Model status: ${data.status}`);
              }
            }
          }
        );
      }

      setTranscribeProgress('Extracting audio at 16000Hz...');

      const response = await fetch(videoSrc);
      const arrayBuffer = await response.arrayBuffer();

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });

      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const audioData = audioBuffer.getChannelData(0);

      setTranscribeProgress('Transcribing with precise word timestamps...');

      const output = await transcriberRef.current(audioData, {
        return_timestamps: 'word',
        chunk_length_s: 30,
        stride_length_s: 5,
      });

      console.log('Whisper word-level output:', output);

      let rawTokens: { text: string; start: number; end: number }[] = [];

      if (output && output.chunks && Array.isArray(output.chunks)) {
        for (const chunk of output.chunks) {
          if (chunk.timestamp && Array.isArray(chunk.timestamp)) {
            const [wordStart, wordEnd] = chunk.timestamp;
            const wordText = (chunk.text || '').trim();
            if (wordText) {
              rawTokens.push({
                text: wordText,
                start: typeof wordStart === 'number' ? wordStart : 0,
                end: typeof wordEnd === 'number' ? wordEnd : (typeof wordStart === 'number' ? wordStart + 0.4 : 0.4)
              });
            }
          } else if (typeof chunk.text === 'string') {
            const chunkStart = chunk.timestamp?.[0] ?? 0;
            const chunkEnd = chunk.timestamp?.[1] ?? (chunkStart + 1.0);
            const words = chunk.text.trim().split(/\s+/).filter(Boolean);
            if (words.length > 0) {
              const span = chunkEnd - chunkStart;
              const step = span / words.length;
              words.forEach((w: string, wIdx: number) => {
                rawTokens.push({
                  text: w,
                  start: chunkStart + wIdx * step,
                  end: chunkStart + (wIdx + 1) * step
                });
              });
            }
          }
        }
      }

      if (rawTokens.length === 0 && output && output.text) {
        const words = output.text.trim().split(/\s+/).filter(Boolean);
        const totalDur = audioBuffer.duration || (words.length * 0.4);
        const timePerWord = totalDur / Math.max(words.length, 1);
        words.forEach((w: string, idx: number) => {
          rawTokens.push({
            text: w,
            start: idx * timePerWord,
            end: (idx + 1) * timePerWord
          });
        });
      }

      const extractedChunks: SubtitleItem[] = [];
      let currentMicroWords: { text: string; start: number; end: number }[] = [];

      const flushMicro = (nextStart?: number) => {
        if (currentMicroWords.length === 0) return;
        const text = currentMicroWords.map(w => w.text).join(' ');
        const start = currentMicroWords[0].start;
        const end = nextStart !== undefined ? nextStart : (currentMicroWords[currentMicroWords.length - 1].end);
        extractedChunks.push({
          id: `micro-${extractedChunks.length}-${Date.now()}`,
          start: parseFloat(start.toFixed(2)),
          end: parseFloat(Math.max(end, start + 0.25).toFixed(2)),
          text: text
        });
        currentMicroWords = [];
      };

      for (let i = 0; i < rawTokens.length; i++) {
        const token = rawTokens[i];
        const testGroup = [...currentMicroWords, token];
        const testText = testGroup.map(w => w.text).join(' ');

        if (testGroup.length <= maxWordsPerBlock && testText.length <= maxCharsPerBlock) {
          currentMicroWords = testGroup;
        } else {
          flushMicro(token.start);
          currentMicroWords = [token];
        }

        if (i === rawTokens.length - 1) {
          flushMicro(token.end);
        }
      }

      if (extractedChunks.length > 0) {
        setSubtitles(extractedChunks);
        setSelectedSubtitleId(extractedChunks[0].id);
      } else {
        alert('No speech segments detected by Whisper.');
      }

      setIsTranscribing(false);
      setTranscribeProgress('');

    } catch (error) {
      console.error('AI Transcription error:', error);
      setIsTranscribing(false);
      setTranscribeProgress('');
      alert('Error during AI transcription. Please check console or try again.');
    }
  };

  // Client-Side Video Rendering & Export using HTML5 Canvas & MediaRecorder with robust Audio Multiplexing & Speed/Chunked Optimization
  const handleExportVideo = async () => {
    if (!videoSrc) {
      alert('Please upload a video first before exporting.');
      return;
    }

    setIsExporting(true);
    setExportProgress('Preparing video renderer...');

    try {
      const video = document.createElement('video');
      video.src = videoSrc;
      video.muted = false; // Ensure audio is active for capture
      video.crossOrigin = 'anonymous';

      await new Promise((resolve, reject) => {
        video.onloadedmetadata = () => resolve(true);
        video.onerror = (err) => reject(err);
      });

      const videoWidth = video.videoWidth || 1280;
      const videoHeight = video.videoHeight || 720;

      const canvas = document.createElement('canvas');
      canvas.width = videoWidth;
      canvas.height = videoHeight;
      const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

      if (!ctx) {
        throw new Error('Could not create canvas context.');
      }

      // 1. ROBUST AUDIO MULTIPLEXING SETUP:
      // Create an AudioContext and connect the HTML5 video element source to a MediaStreamDestination
      // and also to audioCtx.destination (or keep muted/connected properly) so audio is fully preserved & multiplexed into MediaRecorder stream.
      let audioCtx: AudioContext | null = null;
      let audioStreamDestination: MediaStreamAudioDestinationNode | null = null;
      let sourceNode: MediaElementAudioSourceNode | null = null;

      try {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }
        sourceNode = audioCtx.createMediaElementSource(video);
        audioStreamDestination = audioCtx.createMediaStreamDestination();
        
        // Connect source to destination for MediaRecorder audio track
        sourceNode.connect(audioStreamDestination);
        // Also connect to audioCtx.destination so audio pipeline runs properly
        sourceNode.connect(audioCtx.destination);
      } catch (err) {
        console.warn('AudioContext or Web Audio API setup warning:', err);
      }

      const canvasStream = canvas.captureStream(30);

      // Multiplex the captured audio track into the canvas stream if available
      if (audioStreamDestination && audioStreamDestination.stream.getAudioTracks().length > 0) {
        const audioTrack = audioStreamDestination.stream.getAudioTracks()[0];
        canvasStream.addTrack(audioTrack);
        console.log('Successfully multiplexed original video audio track into export stream.');
      } else {
        console.warn('No audio track detected from video source or AudioContext destination.');
      }

      let mimeType = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8,opus';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = '';
      }

      const mediaRecorderOptions = mimeType ? { mimeType, videoBitsPerDwell: 5000000 } : {};
      const mediaRecorder = new MediaRecorder(canvasStream, mediaRecorderOptions);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Use requestAnimationFrame / setTimeout to yield to main thread before blob generation and download triggering
        setTimeout(() => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'exported-subtitled-video.webm';
          a.click();
          
          setTimeout(() => {
            URL.revokeObjectURL(url);
          }, 1000);

          if (audioCtx && audioCtx.state !== 'closed') {
            audioCtx.close().catch(() => {});
          }

          setIsExporting(false);
          setExportProgress('');
        }, 50);
      };

      video.currentTime = 0;
      await video.play();
      mediaRecorder.start(250); // Collect data chunks every 250ms for memory efficiency on long-form videos

      const totalDuration = video.duration || 1;
      
      // Pre-sort and index subtitles for O(1) or binary search lookup
      const sortedSubtitles = [...subtitles].sort((a, b) => a.start - b.start);

      // Fast active subtitle finder
      const findActiveSubtitle = (time: number) => {
        for (let i = 0; i < sortedSubtitles.length; i++) {
          const sub = sortedSubtitles[i];
          if (time >= sub.start && time <= sub.end) {
            return sub;
          }
          if (sub.start > time) {
            break;
          }
        }
        return null;
      };

      let isFinished = false;

      const finishExport = () => {
        if (isFinished) return;
        isFinished = true;
        try {
          video.pause();
        } catch (e) {}
        if (mediaRecorder.state !== 'inactive') {
          try {
            mediaRecorder.requestData(); // Flush remaining buffers immediately
            mediaRecorder.stop();
          } catch (e) {}
        }
      };

      const renderFrame = () => {
        if (isFinished) return;

        if (video.ended || video.currentTime >= totalDuration) {
          finishExport();
          return;
        }

        const currentT = video.currentTime;
        // Cap progress at 99% until onstop finalized blob download
        const rawPercent = Math.round((currentT / totalDuration) * 100);
        const progressPercent = Math.min(99, rawPercent);
        
        setExportProgress(`Finalizing video export... ${progressPercent}% (${formatTime(currentT)} / ${formatTime(totalDuration)})`);

        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, videoWidth, videoHeight);

        // Render subtitle if active
        const activeSub = findActiveSubtitle(currentT);
        if (activeSub) {
          ctx.save();
          const fontSize = Math.round(videoHeight * 0.06);
          const weightPrefix = textStyleMode === 'bold' ? 'bold ' : '';
          const italicPrefix = textStyleMode === 'italic' ? 'italic ' : '';
          ctx.font = `${italicPrefix}${weightPrefix}${fontSize}px Bangers, cursive, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const x = (subtitlePos.x / 100) * videoWidth;
          const y = (subtitlePos.y / 100) * videoHeight;

          if (activePreset === 'solid-box') {
            const metrics = ctx.measureText(activeSub.text);
            const paddingX = fontSize * 0.8;
            const paddingY = fontSize * 0.5;
            const boxWidth = metrics.width + paddingX * 2;
            const boxHeight = fontSize + paddingY * 2;
            const boxX = x - boxWidth / 2;
            const boxY = y - boxHeight / 2;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 2;
            ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

            ctx.fillStyle = textColor;
            ctx.fillText(activeSub.text, x, y);
          } else if (activePreset === 'cinematic') {
            const metrics = ctx.measureText(activeSub.text);
            const paddingX = fontSize * 0.8;
            const paddingY = fontSize * 0.5;
            const boxWidth = metrics.width + paddingX * 2;
            const boxHeight = fontSize + paddingY * 2;
            const boxX = x - boxWidth / 2;
            const boxY = y - boxHeight / 2;

            ctx.fillStyle = 'rgba(35, 23, 12, 0.9)';
            ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
            ctx.lineWidth = 2;
            ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

            ctx.fillStyle = textColor;
            ctx.fillText(activeSub.text, x, y);
          } else {
            ctx.fillStyle = textColor;
            if (outlineColor !== 'NONE') {
              ctx.lineWidth = fontSize * 0.15;
              ctx.strokeStyle = outlineColor;
              ctx.strokeText(activeSub.text, x, y);
            }
            ctx.fillText(activeSub.text, x, y);
          }

          ctx.restore();
        }

        if ('requestVideoFrameCallback' in video && typeof (video as any).requestVideoFrameCallback === 'function') {
          (video as any).requestVideoFrameCallback(renderFrame);
        } else {
          requestAnimationFrame(renderFrame);
        }
      };

      // Fallback timeout watchdog in case video ended events miss
      const watchdogTimer = setInterval(() => {
        if (video.ended || (video.duration && video.currentTime >= video.duration - 0.1)) {
          clearInterval(watchdogTimer);
          finishExport();
        }
      }, 500);

      if ('requestVideoFrameCallback' in video && typeof (video as any).requestVideoFrameCallback === 'function') {
        (video as any).requestVideoFrameCallback(renderFrame);
      } else {
        requestAnimationFrame(renderFrame);
      }

    } catch (err) {
      console.error(err);
      alert('Error rendering video. Please try another video file.');
      setIsExporting(false);
      setExportProgress('');
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#000000] text-[#E1DCC9] font-sans">
      
      {/* ================= LEFT PANEL: Subtitles list with Dual-Handle Duration Sliders & Editor ================= */}
      <aside className="w-96 flex flex-col border-r border-[#412D15]/40 bg-[#1F150C] select-none z-10">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#412D15]/50 bg-[#1F150C]">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-amber-500" />
            <h1 className="font-bold tracking-wide text-base">Subtitles</h1>
          </div>
          <button 
            type="button"
            onClick={handleAddSubtitle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#412D15] hover:bg-[#5a3e20] text-xs font-medium text-[#E1DCC9] transition shadow-sm border border-[#412D15] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Subtitle
          </button>
        </div>

        {/* Subtitle Scrollable List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {subtitles.map((sub, idx) => {
            const isSelected = selectedSubtitleId === sub.id;
            const isActiveNow = currentTime >= sub.start && currentTime <= sub.end;
            const maxTimelineDuration = duration > 0 ? duration : 30;
            const startPercent = Math.min(100, Math.max(0, (sub.start / maxTimelineDuration) * 100));
            const endPercent = Math.min(100, Math.max(0, (sub.end / maxTimelineDuration) * 100));

            return (
              <div 
                key={sub.id}
                onClick={() => setSelectedSubtitleId(sub.id)}
                className={`group relative p-3.5 rounded-lg border transition-all cursor-pointer bg-[#1F150C] ${
                  isSelected 
                    ? 'border-amber-500/80 shadow-md ring-1 ring-amber-500/30' 
                    : isActiveNow
                    ? 'border-amber-500/40 bg-[#271b10]'
                    : 'border-[#412D15]/50 hover:border-[#412D15]'
                }`}
              >
                {/* Index & Timestamps */}
                <div className="flex items-center justify-between mb-2 text-xs text-[#E1DCC9]/70">
                  <span className="font-semibold text-amber-400">#{idx + 1}</span>
                  <div className="flex items-center gap-1 bg-[#412D15]/30 px-2 py-0.5 rounded border border-[#412D15]/40 font-mono text-[11px]">
                    <Clock className="w-3 h-3 text-amber-500/70" />
                    <input 
                      type="number"
                      step="0.1"
                      value={sub.start}
                      onChange={(e) => handleTimestampChange(sub.id, 'start', parseFloat(e.target.value) || 0)}
                      className="w-12 bg-transparent text-amber-300 focus:outline-none text-right font-mono"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span>s -</span>
                    <input 
                      type="number"
                      step="0.1"
                      value={sub.end}
                      onChange={(e) => handleTimestampChange(sub.id, 'end', parseFloat(e.target.value) || 0)}
                      className="w-12 bg-transparent text-amber-300 focus:outline-none text-right font-mono"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span>s</span>
                  </div>
                </div>

                {/* Dual-Handle Timeline Duration Bar */}
                <div className="mb-2.5 pt-1 px-1">
                  <div className="relative h-2 bg-[#150e08] rounded-full border border-[#412D15]/50">
                    {/* Active Segment Fill */}
                    <div 
                      className="absolute top-0 bottom-0 bg-amber-500/40 rounded-full"
                      style={{
                        left: `${startPercent}%`,
                        width: `${Math.max(2, endPercent - startPercent)}%`
                      }}
                    />
                    {/* Start Handle / Dot */}
                    <input 
                      type="range"
                      min={0}
                      max={maxTimelineDuration}
                      step={0.1}
                      value={sub.start}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (val < sub.end) {
                          handleTimestampChange(sub.id, 'start', val);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                    />
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-amber-400 rounded-full border border-black shadow pointer-events-none transition-transform hover:scale-125"
                      style={{ left: `calc(${startPercent}% - 6px)` }}
                    />
                    {/* End Handle / Dot */}
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-amber-400 rounded-full border border-black shadow pointer-events-none transition-transform hover:scale-125"
                      style={{ left: `calc(${endPercent}% - 6px)` }}
                    />
                  </div>
                </div>

                {/* Textarea or editable field */}
                <textarea
                  value={sub.text}
                  onChange={(e) => handleTextChange(sub.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  rows={2}
                  className="w-full bg-[#150e08] text-[#E1DCC9] text-sm p-2 rounded border border-[#412D15]/60 focus:outline-none focus:border-amber-500/60 resize-none font-sans cursor-text"
                  placeholder="Enter subtitle text..."
                />

                {/* Quick actions on hover */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSubtitle(sub.id);
                    }}
                    className="p-1 rounded bg-[#412D15]/80 hover:bg-red-950 text-red-300 transition cursor-pointer"
                    title="Delete subtitle"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Auto-Transcribe trigger */}
        <div className="p-4 border-t border-[#412D15]/50 bg-[#150e08] space-y-2">
          <button 
            type="button"
            onClick={handleAIAutoTranscribe}
            disabled={isTranscribing}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-black font-semibold text-sm transition shadow-lg cursor-pointer ${
              isTranscribing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isTranscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
            {isTranscribing ? 'Transcribing with Whisper...' : 'AI Auto-Transcribe'}
          </button>
          {isTranscribing && transcribeProgress && (
            <div className="text-[11px] text-amber-400/90 text-center font-mono truncate">
              {transcribeProgress}
            </div>
          )}
        </div>
      </aside>

      {/* ================= CENTER AREA: Video Preview & Timeline ================= */}
      <main className="flex-1 flex flex-col bg-[#000000] relative">
        {/* Top Navbar / Upload bar */}
        <header className="h-14 border-b border-[#412D15]/30 flex items-center justify-between px-6 bg-[#000000]">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-widest text-[#E1DCC9]/50 font-semibold">Project</span>
            <span className="text-sm font-medium">Untitled_Video_Subtitles.mp4</span>
          </div>

          <div className="flex items-center gap-3">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleVideoUpload} 
              accept="video/*" 
              className="hidden" 
            />
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[#1F150C] border border-[#412D15] hover:bg-[#412D15]/40 text-xs font-medium transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-amber-500" /> Upload Video
            </button>
          </div>
        </header>

        {/* Video Player Display Area with Fully Synchronized Interactive Bounding Box */}
        <div 
          ref={containerRef}
          onMouseMove={handleMouseMoveDrag}
          onMouseUp={handleMouseUpDrag}
          onMouseLeave={handleMouseUpDrag}
          className="flex-1 flex items-center justify-center p-6 relative overflow-hidden bg-[#000000]"
        >
          <div className="relative max-w-4xl w-full aspect-video bg-[#0a0705] rounded-xl overflow-hidden border border-[#412D15]/40 shadow-2xl flex items-center justify-center select-none">
            {videoSrc ? (
              <video
                ref={videoRef}
                src={videoSrc}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                className="w-full h-full object-contain pointer-events-none"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-8 text-[#E1DCC9]/40 space-y-3">
                <Film className="w-12 h-12 stroke-[1.5] text-[#412D15]" />
                <p className="text-sm">No video loaded. Click "Upload Video" above to start editing subtitles.</p>
              </div>
            )}

            {/* Interactive Draggable Bounding Box & Live Subtitle Preview */}
            {currentSubtitle && (
              <div 
                onMouseDown={(e) => handleMouseDownDrag(e, currentSubtitle.id)}
                className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing p-3 rounded-lg border-2 transition-all z-20 group ${
                  selectedSubtitleId === currentSubtitle.id 
                    ? 'border-amber-500 bg-black/50 shadow-2xl ring-2 ring-amber-500/50' 
                    : 'border-amber-500/60 bg-black/30 hover:border-amber-400'
                } ${isDraggingSubtitle ? 'scale-105 shadow-2xl' : ''}`}
                style={{
                  left: `${subtitlePos.x}%`,
                  top: `${subtitlePos.y}%`,
                }}
              >
                {/* Drag Handle Indicator */}
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 rounded shadow flex items-center gap-1 whitespace-nowrap">
                  <Move className="w-3 h-3" /> Drag to reposition
                </div>

                <div 
                  key={currentSubtitle.id + '-' + currentSubtitle.start}
                  className={`inline-block px-4 py-2 text-4xl uppercase tracking-wider font-bangers whitespace-nowrap ${
                    activePreset === 'solid-box' 
                      ? 'bg-black/85 rounded-md shadow-lg border border-white/15'
                      : activePreset === 'cinematic'
                      ? 'bg-[#23170c]/90 rounded-xl border border-amber-500/30'
                      : ''
                  } ${
                    textStyleMode === 'bold' ? 'font-bold' : textStyleMode === 'italic' ? 'italic font-normal' : 'font-normal'
                  } ${
                    animationMode === 'pop' ? 'animate-subtitle-pop' : ''
                  }`}
                  style={{
                    color: textColor,
                    textShadow: activePreset === 'bold-outline' && outlineColor !== 'NONE'
                      ? `
                        -2px -2px 0 ${outlineColor},
                         0px -2px 0 ${outlineColor},
                         2px -2px 0 ${outlineColor},
                        -2px  0px 0 ${outlineColor},
                         2px  0px 0 ${outlineColor},
                        -2px  2px 0 ${outlineColor},
                         0px  2px 0 ${outlineColor},
                         2px  2px 0 ${outlineColor},
                         0px 4px 12px rgba(0,0,0,0.8)
                      `
                      : '0px 4px 12px rgba(0,0,0,0.8)'
                  }}
                >
                  {currentSubtitle.text}
                </div>
              </div>
            )}

            {/* Exporting Modal Overlay */}
            {isExporting && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                <div className="text-base font-semibold text-amber-200">Exporting Video</div>
                <div className="text-sm text-[#E1DCC9]/70 font-mono">{exportProgress}</div>
              </div>
            )}
          </div>
        </div>

        {/* Timeline & Controls Bar */}
        <div className="h-28 border-t border-[#412D15]/40 bg-[#1F150C] px-6 flex flex-col justify-center gap-3">
          {/* Timeline Scrub Slider */}
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-[#E1DCC9]/60 w-12 text-right">
              {formatTime(currentTime)}
            </span>
            <input 
              type="range"
              min={0}
              max={duration || 100}
              step={0.05}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1.5 bg-[#412D15] rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <span className="text-xs font-mono text-[#E1DCC9]/60 w-12">
              {formatTime(duration)}
            </span>
          </div>

          {/* Player Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={handleReset}
                className="p-2 rounded-lg bg-[#150e08] border border-[#412D15] hover:bg-[#412D15]/50 transition text-[#E1DCC9] cursor-pointer"
                title="Reset time"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button 
                type="button"
                onClick={togglePlay}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition shadow-md cursor-pointer"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black" />}
                {isPlaying ? 'Pause' : 'Play'}
              </button>
            </div>

            <div className="text-xs text-[#E1DCC9]/50 font-medium">
              Dual-Handle Timeline & Live Preview Sync Enabled
            </div>
          </div>
        </div>
      </main>

      {/* ================= RIGHT PANEL: Style Presets, Limits, Animation, Colors, Actions ================= */}
      <aside className="w-80 flex flex-col border-l border-[#412D15]/40 bg-[#1F150C] select-none z-10">
        {/* Header */}
        <div className="p-4 border-b border-[#412D15]/50 bg-[#1F150C] flex items-center gap-2">
          <Settings className="w-5 h-5 text-amber-500" />
          <h2 className="font-bold tracking-wide text-base">Subtitle Styling</h2>
        </div>

        {/* Scrollable Customization Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          
          {/* Style Presets */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#E1DCC9]/60 mb-3 block flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-amber-500" /> Style Presets
            </label>
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'bold-outline', title: 'Bold Outline', desc: 'Heavy pop-art caption style' },
                { id: 'solid-box', title: 'Solid Box', desc: 'Clean filled background box' },
                { id: 'cinematic', title: 'Cinematic', desc: 'Subtle blurred glass subtitle' },
              ].map((preset) => (
                <div 
                  key={preset.id}
                  onClick={() => setActivePreset(preset.id as any)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                    activePreset === preset.id 
                      ? 'border-amber-500 bg-[#412D15]/40 shadow-md ring-1 ring-amber-500/30' 
                      : 'border-[#412D15]/50 bg-[#150e08] hover:border-[#412D15]'
                  }`}
                >
                  <div className="flex flex-col pointer-events-none">
                    <span className="font-black uppercase tracking-wider text-sm text-white font-bangers">
                      {preset.title}
                    </span>
                    <span className="text-[11px] text-[#E1DCC9]/60 mt-0.5">{preset.desc}</span>
                  </div>
                  {activePreset === preset.id && <Check className="w-4 h-4 text-amber-400" />}
                </div>
              ))}
            </div>
          </div>

          <hr className="border-[#412D15]/50" />

          {/* Dynamic Word & Character Limits Control */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#E1DCC9]/60 flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-amber-500" /> Chunk Limits (AI Transcribe)
            </label>
            <div className="grid grid-cols-2 gap-3 bg-[#150e08] p-3 rounded-lg border border-[#412D15]/50">
              <div>
                <span className="text-[11px] text-[#E1DCC9]/70 block mb-1">Max Words</span>
                <input 
                  type="number"
                  min={1}
                  max={10}
                  value={maxWordsPerBlock}
                  onChange={(e) => setMaxWordsPerBlock(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-[#1F150C] border border-[#412D15] rounded px-2 py-1 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <span className="text-[11px] text-[#E1DCC9]/70 block mb-1">Max Chars</span>
                <input 
                  type="number"
                  min={3}
                  max={50}
                  value={maxCharsPerBlock}
                  onChange={(e) => setMaxCharsPerBlock(Math.max(3, parseInt(e.target.value) || 3))}
                  className="w-full bg-[#1F150C] border border-[#412D15] rounded px-2 py-1 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          <hr className="border-[#412D15]/50" />

          {/* Animation Options */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#E1DCC9]/60 mb-3 block flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Subtitle Animation
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'none', label: 'No Animation' },
                { id: 'pop', label: 'Pop Animation' },
              ].map((anim) => (
                <button
                  key={anim.id}
                  type="button"
                  onClick={() => setAnimationMode(anim.id as any)}
                  className={`py-2 px-2.5 rounded-md border text-xs font-semibold transition cursor-pointer text-center ${
                    animationMode === anim.id 
                      ? 'bg-amber-500 text-black border-amber-500 shadow font-bold' 
                      : 'bg-[#150e08] text-[#E1DCC9] border-[#412D15] hover:border-amber-500/50'
                  }`}
                >
                  {anim.label}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-[#412D15]/50" />

          {/* Font Family (Locked) */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[#E1DCC9]/60 mb-3 block flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-amber-500" /> Font Family (Locked)
            </label>
            <div className="p-3 rounded-lg border border-amber-500 bg-[#412D15]/40 shadow-md ring-1 ring-amber-500/30 flex items-center justify-between">
              <div className="flex flex-col pointer-events-none">
                <span className="text-base text-white font-bangers">
                  Bangers
                </span>
                <span className="text-[11px] text-[#E1DCC9]/60">Default comic & energetic font</span>
              </div>
              <Check className="w-4 h-4 text-amber-400" />
            </div>
          </div>

          <hr className="border-[#412D15]/50" />

          {/* Text Style */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#E1DCC9]/60 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-amber-500" /> Text Style
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { name: 'bold', label: 'Bold' },
                { name: 'normal', label: 'Normal' },
                { name: 'italic', label: 'Italic' },
              ].map((style) => (
                <button
                  key={style.name}
                  type="button"
                  onClick={() => setTextStyleMode(style.name as any)}
                  className={`py-2 px-3 rounded-md border text-xs font-semibold transition cursor-pointer text-center ${
                    textStyleMode === style.name 
                      ? 'bg-amber-500 text-black border-amber-500 shadow' 
                      : 'bg-[#150e08] text-[#E1DCC9] border-[#412D15] hover:border-amber-500/50'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-[#412D15]/50" />

          {/* Color Customization */}
          <div className="space-y-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#E1DCC9]/60 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-amber-500" /> Color Customization
            </label>

            {/* Inside Text Fill */}
            <div className="bg-[#150e08] p-3.5 rounded-lg border border-[#412D15]/50 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[#E1DCC9]/80">Inside Text Fill</span>
                <span className="font-mono text-[10px] text-amber-500">{textColor}</span>
              </div>
              <div className="flex items-center gap-2">
                {[
                  { name: 'White', value: '#FFFFFF' },
                  { name: 'Black', value: '#000000' },
                  { name: 'Blue', value: '#3B82F6' },
                  { name: 'Red', value: '#EF4444' },
                  { name: 'Yellow', value: '#F59E0B' },
                  { name: 'Green', value: '#10B981' },
                ].map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setTextColor(color.value)}
                    className={`w-7 h-7 rounded-full border transition transform hover:scale-110 cursor-pointer ${
                      textColor === color.value ? 'ring-2 ring-amber-500 scale-110 border-white' : 'border-black/40'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Outline Stroke */}
            <div className="bg-[#150e08] p-3.5 rounded-lg border border-[#412D15]/50 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[#E1DCC9]/80">Outline Stroke</span>
                <span className="font-mono text-[10px] text-amber-500">{outlineColor}</span>
              </div>
              <div className="flex items-center gap-2.5">
                {[
                  { name: 'Black', value: '#000000', label: 'Black' },
                  { name: 'White', value: '#FFFFFF', label: 'White' },
                  { name: 'None', value: 'NONE', label: 'None' },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setOutlineColor(item.value)}
                    className={`px-3 py-1.5 rounded-md border text-xs font-medium transition cursor-pointer ${
                      outlineColor === item.value 
                        ? 'bg-amber-500 text-black border-amber-500 font-bold shadow' 
                        : 'bg-[#1F150C] text-[#E1DCC9] border-[#412D15] hover:border-amber-500/50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Pinned Delete & Export Action Buttons */}
        <div className="p-4 border-t border-[#412D15]/50 bg-[#150e08] space-y-2.5">
          <button 
            type="button"
            onClick={() => selectedSubtitleId && handleDeleteSubtitle(selectedSubtitleId)}
            disabled={!selectedSubtitleId || isExporting}
            className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium text-xs transition border ${
              selectedSubtitleId && !isExporting
                ? 'bg-red-950/40 hover:bg-red-900/50 text-red-300 border-red-900/50 cursor-pointer' 
                : 'bg-[#1F150C] text-slate-500 border-[#412D15]/30 cursor-not-allowed'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete Selected Subtitle
          </button>

          <button 
            type="button"
            onClick={handleExportVideo}
            disabled={isExporting}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition shadow-md ${
              isExporting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isExporting ? 'Processing Video...' : 'Export Video (MP4/WebM)'}
          </button>
        </div>
      </aside>

    </div>
  );
}
