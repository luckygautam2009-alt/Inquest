import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, ScanLine, Upload } from 'lucide-react';
import { verifyEmployee } from '../api/client';

const SCAN_INTERVAL_MS = 2500;
const RESULT_DISPLAY_MS = 1600;

// Browser's built-in Face Detector (Chrome/Edge only, may be undefined elsewhere)
const FaceDetectorAPI = typeof window !== 'undefined' ? window.FaceDetector : undefined;

/**
 * Metro-gate style continuous scanner with file-upload fallback.
 * If the browser supports getUserMedia the camera feed is used; otherwise
 * (or if the user prefers), a simple file-upload path is shown.
 */
export default function IDScanner({ name, email, adminPassword, onVerified, onCancel }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const activeRef = useRef(true);
  const faceDetectorRef = useRef(null);

  const [mode, setMode] = useState('camera'); // 'camera' | 'upload'
  const [cameraError, setCameraError] = useState(null);
  const [phase, setPhase] = useState('scanning'); // 'scanning' | 'face' | 'checking' | 'success' | 'failed'
  const [lastReason, setLastReason] = useState(null);
  const [confidence, setConfidence] = useState(null);

  // Upload mode state
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);

  useEffect(() => {
    activeRef.current = true;
    if (FaceDetectorAPI) {
      try {
        faceDetectorRef.current = new FaceDetectorAPI({ fastMode: true, maxDetectedFaces: 1 });
      } catch {
        faceDetectorRef.current = null;
      }
    }
    if (mode === 'camera') startCamera();
    return () => {
      activeRef.current = false;
      clearTimeout(timerRef.current);
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraError(null);
      scheduleNextScan();
    } catch {
      setCameraError('Camera access denied or unavailable.');
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function scheduleNextScan() {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(runScan, SCAN_INTERVAL_MS);
  }

  function drawGuideRegionToCanvas() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const cropW = vw * 0.78;
    const cropH = vh * 0.68;
    const cropX = (vw - cropW) / 2;
    const cropY = (vh - cropH) / 2;

    canvas.width = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    return canvas;
  }

  async function looksLikeFace(canvas) {
    if (!faceDetectorRef.current) return false;
    try {
      const faces = await faceDetectorRef.current.detect(canvas);
      if (!faces || faces.length === 0) return false;
      const face = faces[0];
      const faceArea = face.boundingBox.width * face.boundingBox.height;
      const frameArea = canvas.width * canvas.height;
      return faceArea / frameArea > 0.18;
    } catch {
      return false;
    }
  }

  async function runScan() {
    if (!activeRef.current) return;
    const canvas = drawGuideRegionToCanvas();
    if (!canvas) {
      scheduleNextScan();
      return;
    }

    const faceDetected = await looksLikeFace(canvas);
    if (faceDetected) {
      setPhase('face');
      setTimeout(() => {
        if (!activeRef.current) return;
        setPhase('scanning');
        scheduleNextScan();
      }, 1200);
      return;
    }

    setPhase('checking');
    canvas.toBlob(async (blob) => {
      if (!blob || !activeRef.current) {
        scheduleNextScan();
        return;
      }
      const file = new File([blob], 'id-scan.jpg', { type: 'image/jpeg' });
      await sendVerification(file, /* isUploadMode */ false);
    }, 'image/jpeg', 0.85);
  }

  async function sendVerification(file, isUploadMode) {
    try {
      const res = await verifyEmployee({ file, employeeName: name, employeeEmail: email, adminPassword });

      if (!activeRef.current) return;

      if (res.data.verified) {
        setConfidence(res.data.confidence);
        if (isUploadMode) {
          setUploadResult(res.data);
          setTimeout(() => activeRef.current && onVerified(res.data), RESULT_DISPLAY_MS);
        } else {
          setPhase('success');
          stopCamera();
          setTimeout(() => activeRef.current && onVerified(res.data), RESULT_DISPLAY_MS);
        }
      } else {
        const reason = res.data.reason || 'ID card did not match the reference.';
        if (isUploadMode) {
          setUploadError(reason);
          setUploadLoading(false);
        } else {
          setLastReason(reason);
          setPhase('failed');
          setTimeout(() => {
            if (!activeRef.current) return;
            setPhase('scanning');
            scheduleNextScan();
          }, RESULT_DISPLAY_MS);
        }
      }
    } catch (err) {
      if (!activeRef.current) return;
      const reason = err.message || 'Verification request failed';
      if (isUploadMode) {
        setUploadError(reason);
        setUploadLoading(false);
      } else {
        setLastReason(reason);
        setPhase('failed');
        setTimeout(() => {
          if (!activeRef.current) return;
          setPhase('scanning');
          scheduleNextScan();
        }, RESULT_DISPLAY_MS);
      }
    }
  }

  // ── Upload handlers ──
  function handleFileSelect(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadFile(f);
    setUploadError(null);
    setUploadResult(null);
    const reader = new FileReader();
    reader.onload = () => setUploadPreview(reader.result);
    reader.readAsDataURL(f);
  }

  async function handleUploadVerify() {
    if (!uploadFile) return;
    setUploadLoading(true);
    setUploadError(null);
    setUploadResult(null);
    await sendVerification(uploadFile, true);
  }

  function switchToUpload() {
    clearTimeout(timerRef.current);
    stopCamera();
    setMode('upload');
  }

  function switchToCamera() {
    setUploadFile(null);
    setUploadPreview(null);
    setUploadError(null);
    setUploadResult(null);
    setMode('camera');
  }

  return (
    <div className="space-y-4">
      {/* Mode tabs */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={switchToCamera}
          className={`flex-1 text-xs font-bold px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
            mode === 'camera'
              ? 'bg-amber text-ink border-amber'
              : 'bg-ink-lighter text-muted border-border-strong hover:text-paper'
          }`}
        >
          📷 Camera Scan
        </button>
        <button
          type="button"
          onClick={switchToUpload}
          className={`flex-1 text-xs font-bold px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
            mode === 'upload'
              ? 'bg-amber text-ink border-amber'
              : 'bg-ink-lighter text-muted border-border-strong hover:text-paper'
          }`}
        >
          📁 Upload Photo
        </button>
      </div>

      {/* ── Camera mode ── */}
      {mode === 'camera' && (
        <>
          <div className="relative rounded-xl overflow-hidden border border-border-strong bg-ink aspect-video">
            {cameraError ? (
              <div className="flex flex-col items-center justify-center h-full text-xs text-alert p-4 text-center gap-3">
                <XCircle className="w-8 h-8" />
                <p>{cameraError}</p>
                <button
                  type="button"
                  onClick={switchToUpload}
                  className="text-amber font-bold hover:text-amber-light cursor-pointer underline"
                >
                  Upload a photo instead →
                </button>
              </div>
            ) : (
              <>
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

                {phase !== 'success' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative w-[78%] h-[68%]">
                      {['top-0 left-0 border-t-2 border-l-2', 'top-0 right-0 border-t-2 border-r-2',
                        'bottom-0 left-0 border-b-2 border-l-2', 'bottom-0 right-0 border-b-2 border-r-2']
                        .map((cls, i) => (
                          <div
                            key={i}
                            className={`absolute ${cls} w-8 h-8 rounded-sm transition-all duration-200 ${
                              phase === 'failed' || phase === 'face'
                                ? 'border-alert'
                                : phase === 'checking'
                                ? 'border-alert scale-95'
                                : 'border-amber'
                            }`}
                          />
                        ))}
                      {phase === 'scanning' && (
                        <div className="absolute left-0 right-0 h-0.5 bg-amber/80 shadow-[0_0_12px_2px_rgba(217,119,6,0.6)] scanline" />
                      )}
                      {phase === 'checking' && (
                        <div className="absolute inset-0 border-2 border-alert rounded-md bg-alert/10 lock-pulse" />
                      )}
                    </div>
                  </div>
                )}

                <div className="absolute bottom-3 left-0 right-0 flex justify-center px-4">
                  {phase === 'scanning' && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-paper bg-ink/75 px-3 py-1.5 rounded-full backdrop-blur-sm">
                      <ScanLine className="w-3.5 h-3.5 text-amber" />
                      Hold ID card steady in frame — scanning…
                    </span>
                  )}
                  {phase === 'face' && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-alert bg-ink/85 px-3 py-1.5 rounded-full backdrop-blur-sm">
                      <XCircle className="w-3.5 h-3.5" />
                      Face detected — show your ID card instead
                    </span>
                  )}
                  {phase === 'checking' && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-paper bg-ink/75 px-3 py-1.5 rounded-full backdrop-blur-sm">
                      <span className="w-2.5 h-2.5 border-2 border-amber/40 border-t-amber rounded-full animate-spin" />
                      Checking…
                    </span>
                  )}
                  {phase === 'failed' && (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-alert bg-ink/85 px-3 py-1.5 rounded-full backdrop-blur-sm">
                      <XCircle className="w-3.5 h-3.5" />
                      No match — resuming scan
                    </span>
                  )}
                </div>

                {phase === 'success' && (
                  <div className="absolute inset-0 bg-ink/95 flex flex-col items-center justify-center gap-3">
                    <CheckCircle2 className="w-14 h-14 text-verified pop-in" />
                    <span className="text-base font-bold text-verified">Access Granted</span>
                  </div>
                )}
              </>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {lastReason && phase === 'scanning' && (
            <p className="text-[11px] text-muted text-center">Last attempt: {lastReason}</p>
          )}
        </>
      )}

      {/* ── Upload mode ── */}
      {mode === 'upload' && (
        <div className="space-y-3.5">
          {/* File picker / preview */}
          {uploadPreview ? (
            <div className="relative rounded-xl overflow-hidden border border-border-strong bg-ink">
              <img src={uploadPreview} alt="ID card preview" className="w-full object-contain max-h-64" />
              {uploadResult?.verified && (
                <div className="absolute inset-0 bg-ink/90 flex flex-col items-center justify-center gap-3">
                  <CheckCircle2 className="w-14 h-14 text-verified pop-in" />
                  <span className="text-base font-bold text-verified">Access Granted</span>
                </div>
              )}
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border-strong rounded-xl px-4 py-10 text-sm text-muted cursor-pointer hover:border-amber/50 transition-colors">
              <Upload className="w-8 h-8 text-muted" />
              <span className="font-semibold">Click to upload your ID card photo</span>
              <span className="text-xs text-muted/60">JPG, PNG, or WebP</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            </label>
          )}

          {/* Change file */}
          {uploadFile && !uploadResult?.verified && (
            <div className="flex items-center justify-between gap-2 text-xs text-muted">
              <span className="truncate">{uploadFile.name}</span>
              <label className="text-amber font-semibold cursor-pointer hover:text-amber-light shrink-0">
                Change file
                <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
              </label>
            </div>
          )}

          {/* Errors */}
          {uploadError && (
            <div className="flex items-start gap-2 text-xs text-alert bg-alert-dim border border-alert/30 rounded-lg px-3 py-2 font-medium">
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Verify button */}
          {uploadFile && !uploadResult?.verified && (
            <button
              type="button"
              onClick={handleUploadVerify}
              disabled={uploadLoading}
              className="w-full bg-amber text-ink font-bold px-4 py-2.5 rounded-lg text-sm disabled:opacity-50 hover:bg-amber-light transition-colors cursor-pointer"
            >
              {uploadLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-ink/30 border-t-ink rounded-full animate-spin" />
                  Verifying…
                </span>
              ) : (
                'Verify ID Card'
              )}
            </button>
          )}
        </div>
      )}

      {/* Cancel */}
      <button
        type="button"
        onClick={onCancel}
        className="w-full bg-ink-lighter text-paper font-semibold px-4 py-2.5 rounded-lg text-sm border border-border-strong hover:bg-ink transition-colors cursor-pointer"
      >
        Cancel
      </button>
    </div>
  );
}
