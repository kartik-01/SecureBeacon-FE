import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { CheckCircle, XCircle, X, Info } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import LetterGlitch from './animations/LetterGlitch';
import PixelBlast from './animations/PixelBlast';
import { motion } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';
import { useEncryption } from '@/contexts/EncryptionContext';
import { mlService, backendService } from '@/services/api';
import { toast } from 'sonner';
import type { AnalysisResultUI } from '@/types/api';
import { HistoryDrawer } from './HistoryDrawer';
import { Navbar } from './Navbar';

interface PhishingCheckerProps {
  onBack: () => void;
  onAuth?: () => void;
}

export function PhishingChecker({ onBack, onAuth }: PhishingCheckerProps) {
  const { isAuthenticated, getAccessTokenSilently, user } = useAuth();
  const { encryptData, isUnlocked, isSetup } = useEncryption();
  const [emailContent, setEmailContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>(''); // Store file content for header parsing
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResultUI | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const historyButtonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showReloadNotice, setShowReloadNotice] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const analyzingRef = useRef<HTMLDivElement>(null);

  // Blur file input and other focusable elements when encryption unlock dialog is about to open
  // This prevents aria-hidden warning when dialog applies aria-hidden to background
  useLayoutEffect(() => {
    if (isSetup && !isUnlocked) {
      // Blur file input specifically (common culprit)
      fileInputRef.current?.blur();
      
      // Blur any other focused elements in this component
      const activeElement = document.activeElement as HTMLElement | null;
      if (activeElement && activeElement !== document.body) {
        // Check if active element is inside this component but not in a dialog
        const isInDialog = activeElement.closest('[role="dialog"]');
        const isInThisComponent = activeElement.closest('[data-phishing-checker]');
        if (!isInDialog && isInThisComponent) {
          activeElement.blur();
        }
      }
    }
  }, [isSetup, isUnlocked]);

  // Show reload notice when user first lands on the analysis screen
  // Show it when encryption is set up (whether unlocked or not) - user needs to know about reload behavior
  // Also show it for guest mode users to encourage login
  useEffect(() => {
    if (isSetup) {
      // Check if notice was dismissed in this session
      const dismissed = sessionStorage.getItem('reload_notice_dismissed');
      if (!dismissed) {
        setShowReloadNotice(true);
      }
    } else if (!isAuthenticated) {
      // Show notice for guest mode users
      const dismissed = sessionStorage.getItem('guest_notice_dismissed');
      if (!dismissed) {
        setShowReloadNotice(true);
      }
    } else {
      setShowReloadNotice(false);
    }
  }, [isSetup, isAuthenticated]);

  const handleDismissNotice = () => {
    setShowReloadNotice(false);
    if (isAuthenticated && isSetup) {
      sessionStorage.setItem('reload_notice_dismissed', 'true');
    } else {
      sessionStorage.setItem('guest_notice_dismissed', 'true');
    }
  };

  // Convert API response to UI format
  const mapToUIResult = (apiResult: any): AnalysisResultUI => {
    // Email analysis format
    const isPhishing = apiResult.is_phishing || false;
    const confidence = (apiResult.phishing_probability ?? 0) * 100;
    
    let threatLevel: 'low' | 'medium' | 'high' | 'critical';
    if (confidence > 75) threatLevel = 'critical';
    else if (confidence > 50) threatLevel = 'high';
    else if (confidence > 25) threatLevel = 'medium';
    else threatLevel = 'low';

    return {
      isPhishing,
      confidence,
      threatLevel,
      indicators: [],
      details: {},
    };
  };

  // Auto-scroll to analyzing section when analysis starts
  useEffect(() => {
    if (analyzing) {
      const scrollToAnalyzing = () => {
        if (analyzingRef.current) {
          const navbarHeight = 80;
          const element = analyzingRef.current;
          const elementTop = element.getBoundingClientRect().top + window.scrollY;
          const offsetPosition = elementTop - navbarHeight - 20;
          
          window.scrollTo({
            top: Math.max(0, offsetPosition),
            behavior: 'smooth'
          });
        }
      };
      
      // Try scrolling after delays to ensure element is rendered
      const timeoutId1 = setTimeout(scrollToAnalyzing, 100);
      const timeoutId2 = setTimeout(scrollToAnalyzing, 300);
      const timeoutId3 = setTimeout(scrollToAnalyzing, 500);
      
      return () => {
        clearTimeout(timeoutId1);
        clearTimeout(timeoutId2);
        clearTimeout(timeoutId3);
      };
    }
  }, [analyzing]);

  // Auto-scroll to result when analysis completes
  useEffect(() => {
    if (result && !analyzing) {
      // Wait for DOM to be ready and element to be rendered
      const scrollToResult = () => {
        if (resultRef.current) {
          const navbarHeight = 80;
          const element = resultRef.current;
          
          // Calculate position with offset
          const elementTop = element.getBoundingClientRect().top + window.scrollY;
          const offsetPosition = elementTop - navbarHeight - 20;
          
          window.scrollTo({
            top: Math.max(0, offsetPosition),
            behavior: 'smooth'
          });
        }
      };
      
      // Try scrolling after a delay to ensure element is rendered
      const timeoutId1 = setTimeout(scrollToResult, 100);
      const timeoutId2 = setTimeout(scrollToResult, 500);
      const timeoutId3 = setTimeout(scrollToResult, 1000);
      
      return () => {
        clearTimeout(timeoutId1);
        clearTimeout(timeoutId2);
        clearTimeout(timeoutId3);
      };
    }
  }, [result, analyzing]);

  const analyzeEmail = async () => {
    if (!emailContent.trim() && !selectedFile) {
      toast.error('Please paste email content or upload a file');
      return;
    }

    setAnalyzing(true);
    setResult(null);
    const startTime = Date.now();
    
    // Scroll to analyzing section immediately
    setTimeout(() => {
      if (analyzingRef.current) {
        const navbarHeight = 80;
        const element = analyzingRef.current;
        const elementTop = element.getBoundingClientRect().top + window.scrollY;
        const offsetPosition = elementTop - navbarHeight - 20;
        
        window.scrollTo({
          top: Math.max(0, offsetPosition),
          behavior: 'smooth'
        });
      }
    }, 100);

    try {
      let content = emailContent;
      
      // If file is selected, read it
      if (selectedFile) {
        if (!selectedFile.name.endsWith('.eml')) {
          toast.error('Please upload a .eml file');
          setAnalyzing(false);
          return;
        }
        content = await selectedFile.text();
        setFileContent(content); // Store file content for header parsing
      } else {
        setFileContent(''); // Clear file content if using text input
      }

      // Always call ML API first
      const mlResult = await mlService.predictPhishing(content);
      const uiResult = mapToUIResult(mlResult);

      // Ensure minimum 2 second analyzing animation
      const elapsedTime = Date.now() - startTime;
      const remainingDelay = Math.max(0, 2000 - elapsedTime);
      await new Promise(resolve => setTimeout(resolve, remainingDelay));

      setResult(uiResult);
      
      // Trigger scroll after React renders the component
      setTimeout(() => {
        if (resultRef.current) {
          const navbarHeight = 80;
          const element = resultRef.current;
          const elementTop = element.getBoundingClientRect().top + window.scrollY;
          const offsetPosition = elementTop - navbarHeight - 20;
          
          window.scrollTo({
            top: Math.max(0, offsetPosition),
            behavior: 'smooth'
          });
        }
      }, 800);

      // Auto-save to backend if authenticated and encryption unlocked
      if (isAuthenticated && user?.email && isUnlocked) {
        try {
          const token = await getAccessTokenSilently();
          // Encrypt data before sending
          const encryptedData = await encryptData({
            userEmail: user.email,
            inputContent: content,
            mlResult: {
              is_phishing: mlResult.is_phishing,
              phishing_probability: mlResult.phishing_probability,
            },
          });
          await backendService.saveResults('eml', encryptedData.inputContent!, encryptedData.mlResult!, encryptedData.userEmail!, token);
          // Silently save - no toast notification for auto-save
        } catch (error: any) {
          // Failed to auto-save to backend
          // Don't show error to user, just log it
        }
      }

      toast.success('Analysis complete');
    } catch (error: any) {
      toast.error(error.message || 'Failed to analyze email');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setEmailContent(''); // Clear text content when file is selected
      setFileContent(''); // Clear previous file content
    }
  };

  // Prevent file input from retaining focus when encryption dialog is open
  const handleFileInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (isSetup && !isUnlocked) {
      // If encryption unlock dialog is open, blur immediately
      e.target.blur();
    }
  };

  // Parse email headers from content
  const parseEmailHeaders = (content: string) => {
    const headers: Record<string, string> = {};
    const lines = content.split('\n');
    let currentHeader = '';
    let currentValue = '';
    let headerEnded = false;

    for (const line of lines) {
      if (headerEnded) break;
      
      // Check if line starts a new header (contains colon and not indented)
      if (line.includes(':') && !line.match(/^\s/)) {
        // Save previous header
        if (currentHeader) {
          headers[currentHeader.toLowerCase()] = currentValue.trim();
        }
        // Start new header
        const [header, ...valueParts] = line.split(':');
        currentHeader = header.trim();
        currentValue = valueParts.join(':').trim();
      } else if (currentHeader && (line.match(/^\s/) || line.match(/^\t/))) {
        // Continuation of previous header (indented)
        currentValue += ' ' + line.trim();
      } else if (line.trim() === '') {
        // Empty line marks end of headers
        if (currentHeader) {
          headers[currentHeader.toLowerCase()] = currentValue.trim();
          currentHeader = '';
          currentValue = '';
        }
        headerEnded = true;
      } else if (currentHeader) {
        // Save current header if we hit non-header content
        headers[currentHeader.toLowerCase()] = currentValue.trim();
        currentHeader = '';
        currentValue = '';
      }
    }

    // Save last header
    if (currentHeader) {
      headers[currentHeader.toLowerCase()] = currentValue.trim();
    }

    return {
      from: headers['from'] || 'Unknown',
      subject: headers['subject'] || 'No Subject',
      messageId: headers['message-id'] || headers['messageid'] || 'N/A',
      to: headers['to'] || headers['delivered-to'] || 'N/A',
    };
  };

  const getResultMessage = (isPhishing: boolean, threatLevel: string, confidence: number, emailContent?: string): { title: string; message: string } => {
    // Parse email headers if content is available
    let emailInfo = '';
    if (emailContent) {
      try {
        const headers = parseEmailHeaders(emailContent);
        // Extract just the email address from From field (remove display name if present)
        const fromEmail = headers.from.match(/<([^>]+)>/) 
          ? headers.from.match(/<([^>]+)>/)![1] 
          : headers.from.split(' ').pop() || headers.from;
        
        emailInfo = `\n\nEmail Details:\n• From: ${fromEmail}\n• Subject: ${headers.subject}`;
      } catch (e) {
        // If parsing fails, continue without header info
      }
    }

    if (isPhishing) {
      switch (threatLevel) {
        case 'critical':
          return {
            title: '🚨 CRITICAL THREAT',
            message: `Do NOT click any links, download attachments, or provide personal information. Delete this email immediately and report it as spam/phishing to your email provider.${emailInfo}`,
          };
        case 'high':
          return {
            title: '⚠️ HIGH RISK',
            message: `Exercise extreme caution. Do not click links or provide any sensitive information. Verify the sender through official channels before responding.${emailInfo}`,
          };
        case 'medium':
          return {
            title: '⚠️ SUSPICIOUS',
            message: `Be careful when interacting with it. Avoid clicking unfamiliar links and never share sensitive data through email.${emailInfo}`,
          };
        default:
          return {
            title: '⚠️ LOW RISK PHISHING',
            message: `Review it carefully before taking any action. When in doubt, verify the sender through official channels.${emailInfo}`,
          };
      }
    } else {
      return {
        title: '✅ APPEARS LEGITIMATE',
        message: `This email has a ${(100 - confidence).toFixed(1)}% chance of being legitimate based on our analysis. However, always exercise caution and verify requests for sensitive information. Stay vigilant against social engineering tactics.${emailInfo}`,
      };
    }
  };

  return (
    <div className="min-h-screen bg-black text-emerald-400 relative" data-phishing-checker>
      {/* Pixel Blast Background */}
      <div className="fixed inset-0 opacity-50" style={{ width: '100%', height: '100%', zIndex: 0, minHeight: '100vh', minWidth: '100vw' }}>
        <PixelBlast 
          variant="circle"
          pixelSize={7}
          color="#10b981"
          patternScale={3}
          patternDensity={1.0}
          pixelSizeJitter={0.5}
          enableRipples
          rippleSpeed={0.4}
          rippleThickness={0.12}
          rippleIntensityScale={1.5}
          liquid
          liquidStrength={0.12}
          liquidRadius={1.2}
          liquidWobbleSpeed={5}
          speed={0.6}
          edgeFade={0.25}
          transparent
        />
      </div>

      {/* Navbar */}
      <Navbar 
        showBackButton 
        onBack={onBack}
        showGuestMode={!isAuthenticated}
        showHistory={isAuthenticated}
        onAuth={onAuth}
        onHistoryClick={() => {
          (document.activeElement as HTMLElement | null)?.blur?.();
          setShowHistory(true);
        }}
        historyButtonRef={historyButtonRef}
      />

      {/* Reload Notice / Guest Mode Notice */}
      {showReloadNotice && (
        <div className="w-full flex justify-center pt-8 pb-2 px-4 relative z-10">
          <div 
            className="max-w-2xl w-full rounded-lg p-3 sm:p-4 flex items-center gap-3"
            style={{
              backgroundColor: 'rgba(10, 13, 10, 0.5)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              boxShadow: '0 2px 20px rgba(16, 185, 129, 0.15)',
              border: '1px solid #093d0f',
            }}
          >
            <Info className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            {isAuthenticated && isSetup ? (
              <p className="text-sm sm:text-base text-slate-200 flex-1 font-mono">
                <span className="text-emerald-400">Note:</span> If you reload the page, you'll need to enter your passphrase again for security.
              </p>
            ) : (
              <p className="text-sm sm:text-base text-slate-200 flex-1 font-mono">
                <span className="text-emerald-400">Save your analysis history</span> securely with end-to-end encryption. <span className="text-emerald-400 font-semibold">Login or Sign Up</span> to get started.
              </p>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismissNotice}
              className="text-slate-400 hover:text-slate-50 hover:bg-slate-800/50 p-1 sm:p-2 h-auto flex-shrink-0"
              aria-label="Dismiss notice"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-4 sm:py-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          <Card 
            className="p-4 sm:p-6"
            style={{
              backgroundColor: 'rgba(10, 13, 10, 0.5)',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
              boxShadow: '0 2px 20px rgba(16, 185, 129, 0.15)',
              border: '1px solid #093d0f',
            }}
          >
            <h2 className="text-lg sm:text-xl mb-4 text-slate-50">Analyze Email Content</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    Upload .eml file (optional)
                  </label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".eml"
                      onChange={handleFileChange}
                      onFocus={handleFileInputFocus}
                      className="text-slate-100 font-mono text-sm border-0 bg-transparent p-0 [&::file-selector-button]:text-white [&::file-selector-button]:bg-[#08170a] [&::file-selector-button]:rounded-full [&::file-selector-button]:px-4 [&::file-selector-button]:py-1.5 [&::file-selector-button]:border-0 [&::file-selector-button]:cursor-pointer [&::file-selector-button]:hover:bg-[#0a1f0d] [&::file-selector-button]:transition-colors [&::file-selector-button]:mr-3 [&::file-selector-button]:h-auto [&::file-selector-button]:leading-normal"
                      style={{
                        boxShadow: 'none',
                        lineHeight: '1.5rem',
                      }}
                    />
                    {selectedFile && (
                      <span className="text-sm text-emerald-400 truncate max-w-48">{selectedFile.name}</span>
                    )}
                  </div>
                </div>
                <div className="text-center text-slate-400 text-sm">OR</div>
                <div>
                  <Textarea
                    placeholder="Paste full raw email with headers (Delivered-To, Received, From, To, Subject, etc.) and body content..."
                    value={emailContent}
                    onChange={(e) => {
                      setEmailContent(e.target.value);
                      setSelectedFile(null); // Clear file when text is entered
                    }}
                    className="text-slate-100 font-mono min-h-[150px] sm:min-h-[200px] placeholder:text-slate-500 text-sm"
                    style={{
                      backgroundColor: 'rgba(10, 13, 10, 0.5)',
                      backdropFilter: 'blur(2px)',
                      WebkitBackdropFilter: 'blur(2px)',
                      boxShadow: '0 2px 20px rgba(16, 185, 129, 0.15)',
                      border: '1px solid #093d0f',
                    }}
                  />
                  <p className="text-xs text-slate-400 mt-2 font-mono">
                    Paste the complete email including all headers and body content
                  </p>
                </div>
                <Button
                  onClick={analyzeEmail}
                  disabled={(!emailContent && !selectedFile) || analyzing}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 shadow-lg shadow-emerald-500/30 py-3 text-sm sm:text-base"
                >
                  {analyzing ? 'Analyzing...' : 'Analyze Email'}
                </Button>
              </div>
            </Card>
          </div>

        {/* Analysis Progress */}
        {analyzing && (
          <motion.div
            ref={analyzingRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto mt-8"
          >
            <Card 
              className="p-12 flex flex-col items-center justify-center min-h-[300px]"
              style={{
                backgroundColor: 'rgba(10, 13, 10, 0.5)',
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)',
                boxShadow: '0 2px 20px rgba(16, 185, 129, 0.15)',
                border: '1px solid #093d0f',
              }}
            >
              <div className="flex flex-col items-center gap-6">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-500 border-t-transparent"></div>
                <h3 className="text-2xl text-slate-50 font-mono">
                  <LetterGlitch text="ANALYZING THREAT..." glitchIntensity={0.15} />
                </h3>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Results */}
        {result && !analyzing && (
          <motion.div
            ref={resultRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-4xl mx-auto mt-4 sm:mt-8"
          >
            <Card 
              className="p-4 sm:p-6 md:p-8"
              style={{
                backgroundColor: 'rgba(10, 13, 10, 0.5)',
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)',
                boxShadow: '0 2px 20px rgba(16, 185, 129, 0.15)',
                border: '1px solid #093d0f',
              }}
            >
              <div className="flex items-start gap-4 mb-2">
                <div className="flex items-center gap-4 w-full">
                  {result.isPhishing ? (
                    <XCircle className="w-12 h-12 sm:w-16 sm:h-16 text-red-500 flex-shrink-0" />
                  ) : (
                    <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-500 flex-shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <h2 className={`text-xl sm:text-2xl md:text-3xl mb-1 ${result.isPhishing ? 'text-red-400' : 'text-emerald-400'}`}>
                      {result.isPhishing ? 'THREAT DETECTED' : 'APPEARS SAFE'}
                    </h2>
                    <p className="text-sm sm:text-base md:text-lg text-slate-200">
                      {result.isPhishing 
                        ? `This email has a ${result.confidence.toFixed(1)}% chance of being a phishing attempt.`
                        : `This email has a ${(100 - result.confidence).toFixed(1)}% chance of being legitimate.`
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className={`p-3 sm:p-4 rounded-lg border ${
                 result.isPhishing
                  ? 'border-red-500/50 bg-red-950/30'
                  : 'border-green-500/50 bg-green-950/30'
              }`}>
                <h3 className={`text-base sm:text-lg font-mono mb-2 sm:mb-3 ${
                  result.isPhishing ? 'text-red-300' : 'text-green-300'
                }`}>
                  {getResultMessage(result.isPhishing, result.threatLevel, result.confidence, selectedFile ? fileContent : emailContent).title}
                </h3>
                <p className="text-slate-100 leading-relaxed font-mono text-xs sm:text-sm whitespace-pre-line">
                  {getResultMessage(result.isPhishing, result.threatLevel, result.confidence, selectedFile ? fileContent : emailContent).message}
                </p>
              </div>
            </Card>
          </motion.div>
        )}
      </div>

      {isAuthenticated && (
        <HistoryDrawer open={showHistory} onOpenChange={setShowHistory} triggerRef={historyButtonRef} />
      )}
    </div>
  );
}


