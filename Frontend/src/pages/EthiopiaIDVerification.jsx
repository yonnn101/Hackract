import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  FiShield, FiCheckCircle, FiInfo, FiCreditCard, 
  FiAlertCircle, FiArrowRight, FiMail, FiPhone, FiGlobe, FiLock 
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import NationalIDService from '../services/nationalID.service';
import { useAuth } from '../context/authContext.jsx';

// Validation Schema
const step1Schema = z.object({
  fan: z.string().refine((val) => val.replace(/\s/g, '').length === 16 && /^\d+$/.test(val.replace(/\s/g, '')), {
    message: 'FAN must be exactly 16 digits',
  })
});

const step2Schema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must be numeric')
});

const getNationalIdErrorMessage = (error, fallback) => {
  const payload = error?.response?.data || {};

  if (payload.errorCode === 'FAN_NOT_FOUND') {
    return 'This FAN does not exist in the Government Registry.';
  }

  if (payload.errorCode === 'FAN_EMAIL_MISMATCH') {
    return 'Your Hackract login email does not match the government-registered email for this FAN.';
  }

  return payload.message || payload.error || fallback;
};

const getNationalIdSuccessMessage = (result, fallback) => {
  if (result?.delivered === true) {
    return result.message || 'OTP sent successfully to the email registered on National ID.';
  }

  if (result?.delivered === false) {
    return result.message || 'FAN and email matched, but the verification email could not be sent.';
  }

  return result?.message || fallback;
};

const EthiopiaIDVerification = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Details, 2: OTP
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusData, setStatusData] = useState(null);
  const [emailPreview, setEmailPreview] = useState('');
  const { refreshUser } = useAuth();

  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    resolver: zodResolver(step === 1 ? step1Schema : step2Schema),
    defaultValues: {
      gender: 'Male',
      nationality: 'ET'
    }
  });

  const fan = watch('fan');

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (statusData?.verificationStatus === 'APPROVED' || statusData?.verificationStatus === 'VERIFIED') {
      const timer = setTimeout(() => {
        navigate('/hacker-profile');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [statusData, navigate]);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const data = await NationalIDService.getStatus();
      setStatusData(data.data);
    } catch (error) {
      console.error('Failed to fetch status', error);
    } finally {
      setLoading(false);
    }
  };

  const onInitiateSubmit = async (data) => {
    setSubmitting(true);
    try {
      const rawFan = data.fan.replace(/\s/g, '');
      const result = await NationalIDService.initiateVerification({ fan: rawFan });
      
      if (result.autoVerified) {
        toast.success('Identity Auto-Verified!');
        try { await refreshUser(); } catch { /* ignore */ }
        fetchStatus();
      } else {
        if (result.delivered === false || result.error) {
          toast.error(result.error || result.message || 'FAN and email matched, but the verification email could not be sent.');
          return;
        } else {
          toast.success(getNationalIdSuccessMessage(result, 'OTP Sent Successfully!'));
        }
        
        setEmailPreview('your official government-registered email');
        setStep(2);
      }
    } catch (error) {
      toast.error(getNationalIdErrorMessage(error, 'Could not start Fayda verification.'));
    } finally {
      setSubmitting(false);
    }
  };

  const onResendOtp = async () => {
    const rawFan = fan?.replace(/\s/g, '');
    if (!rawFan) return;
    setSubmitting(true);
    try {
      const result = await NationalIDService.initiateVerification({ fan: rawFan });
      if (result.delivered === false || result.error) toast.error(result.error || result.message);
      else toast.success(getNationalIdSuccessMessage(result, 'A new OTP has been sent.'));
    } catch (error) {
      toast.error(getNationalIdErrorMessage(error, 'Failed to resend OTP.'));
    } finally {
      setSubmitting(false);
    }
  };

  const onOtpVerify = async (data) => {
    setSubmitting(true);
    try {
      const rawFan = fan?.replace(/\s/g, '');
      await NationalIDService.verifyOtp({ fan: rawFan, otp: data.otp });
      toast.success('Identity Verified Successfully!');
      try { await refreshUser(); } catch { /* ignore */ }
      fetchStatus();
      setStep(1); // Reset step on success
    } catch (error) {
      toast.error(getNationalIdErrorMessage(error, 'OTP verification failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-[#00c477] font-mono animate-pulse">CONNECTING_TO_NATIONAL_REGISTRY...</div>
      </div>
    );
  }

  const status = statusData?.verificationStatus || 'NOT_STARTED';
  const isApproved = status === 'APPROVED';

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12 font-sans selection:bg-[#00c477]/30">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={() => navigate(-1)}
          className="group flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-all text-sm font-mono"
        >
          <FiArrowRight className="rotate-180 group-hover:-translate-x-1 transition-transform" /> BACK_TO_PROFILE
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-green-500/20 to-yellow-500/20 rounded-2xl border border-white/10 shadow-lg shadow-green-500/5">
                  <FiShield className="text-3xl text-[#00c477]" />
                </div>
                <div>
                  <h1 className="text-4xl font-black tracking-tighter">Identity Core</h1>
                  <p className="text-gray-400 text-sm font-mono uppercase tracking-widest">National Verification System</p>
                </div>
              </div>
            </div>

            {isApproved ? (
              <div className="bg-[#00c477]/5 border border-[#00c477]/20 p-8 rounded-3xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <FiCheckCircle size={120} />
                </div>
                <div className="relative z-10 space-y-6">
                  <div className="flex items-center gap-3 text-[#00c477]">
                    <FiCheckCircle className="text-2xl" />
                    <h3 className="text-xl font-bold">Verification Complete</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-8 py-6 border-y border-white/5">
                    <div className="space-y-1">
                        <p className="text-[10px] text-gray-500 uppercase font-mono tracking-tighter">Full Name</p>
                        <p className="text-lg font-medium">{statusData.citizen?.fullName}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] text-gray-500 uppercase font-mono tracking-tighter">Fayda ID Number (FIN)</p>
                        <p className="text-lg font-mono text-[#00c477]">{statusData.citizen?.fin}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400">
                    Your identity has been cryptographically verified against the national registry. Your trust score has been boosted.
                  </p>
                  <button
                    onClick={() => navigate('/hacker-profile')}
                    className="w-full mt-4 py-4 bg-[#00c477] hover:bg-[#009a5e] text-black font-black uppercase tracking-[0.15em] rounded-xl transition-all active:scale-[0.99] shadow-[0_0_20px_rgba(0,196,119,0.2)]"
                  >
                    Return to Profile Settings
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 shadow-2xl relative">
                <div className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#00c477]/50 to-transparent"></div>
                
                {step === 1 ? (
                  <form onSubmit={handleSubmit(onInitiateSubmit)} className="space-y-8">
                    <div className="flex flex-col items-center justify-center space-y-6 max-w-sm mx-auto pt-4">
                      
                      {/* Single FAN Input */}
                      <div className="w-full space-y-2">
                        <label className="text-xs font-mono text-gray-400 uppercase tracking-[0.2em] text-center block">Fayda Access Number (FAN)</label>
                        <div className="relative">
                          <FiCreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg" />
                          <input 
                            {...register('fan', {
                              onChange: (e) => {
                                const rawValue = e.target.value.replace(/\D/g, '');
                                const formattedValue = rawValue.replace(/(\d{4})(?=\d)/g, '$1 ');
                                e.target.value = formattedValue;
                              }
                            })}
                            className={`w-full bg-black/60 border ${errors.fan ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-white/10 hover:border-white/20 focus:border-[#00c477] focus:shadow-[0_0_20px_rgba(0,196,119,0.15)]'} rounded-2xl py-5 pl-14 pr-4 focus:outline-none transition-all font-mono uppercase text-center text-xl tracking-[0.2em]`}
                            placeholder="0000 0000 0000 0000"
                            maxLength={19}
                            autoFocus
                          />
                        </div>
                        {errors.fan && <p className="text-red-500 text-[10px] mt-2 font-mono text-center">{errors.fan.message}</p>}
                      </div>

                      <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl flex gap-3 text-left w-full">
                         <FiInfo className="text-yellow-500 shrink-0 mt-0.5 text-lg" />
                         <p className="text-[10px] text-gray-400 leading-relaxed">
                           Your FAN will be matched against the National Citizen Registry. If found, a 6-digit OTP will be sent to your <strong>official government-registered email</strong>.
                         </p>
                      </div>

                      <button 
                        type="submit"
                        disabled={submitting}
                        className="w-full py-5 bg-[#00c477] hover:bg-white text-black font-black uppercase tracking-[0.15em] rounded-2xl transition-all active:scale-[0.99] disabled:opacity-50 shadow-[0_0_30px_rgba(0,196,119,0.2)]"
                      >
                        {submitting ? 'CHECKING REGISTRY...' : 'Verify National ID'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleSubmit(onOtpVerify)} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center space-y-4">
                      <div className="inline-flex p-4 bg-blue-500/10 rounded-full text-blue-500">
                        <FiMail size={32} />
                      </div>
                      <h2 className="text-2xl font-bold">Check Your Official Email</h2>
                      <p className="text-sm text-gray-400">
                        We've sent a 6-digit OTP to your registered email address:<br/>
                        <span className="text-white font-mono">{emailPreview}</span>
                      </p>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em] text-center block">Enter 6-Digit OTP</label>
                       <div className="relative max-w-[240px] mx-auto">
                          <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                          <input 
                            {...register('otp')}
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-5 pl-12 pr-4 focus:outline-none focus:border-[#00c477] transition-all text-center text-3xl font-bold tracking-[0.5em]"
                            placeholder="000000"
                            maxLength={6}
                            autoFocus
                          />
                       </div>
                       {errors.otp && <p className="text-red-500 text-[10px] text-center mt-2 font-mono">{errors.otp.message}</p>}
                    </div>

                    <div className="flex flex-col gap-4">
                      <button 
                        type="submit"
                        disabled={submitting}
                        className="w-full py-5 bg-white text-black font-black uppercase tracking-[0.15em] rounded-2xl transition-all active:scale-[0.99] disabled:opacity-50 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:bg-gray-200"
                      >
                        {submitting ? 'VERIFYING...' : 'Complete Verification'}
                      </button>
                      
                      <div className="flex justify-between items-center px-2">
                        <button 
                          type="button"
                          onClick={() => setStep(1)}
                          className="text-[11px] font-mono text-gray-500 hover:text-white transition-colors uppercase tracking-widest"
                        >
                          ← Change FAN
                        </button>
                        <button 
                          type="button"
                          onClick={onResendOtp}
                          disabled={submitting}
                          className="text-[11px] font-mono text-[#00c477] hover:text-white transition-colors uppercase tracking-widest disabled:opacity-50"
                        >
                          Resend OTP
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          
        </div>
      </div>
      
      <style jsx>{`
        .invert-calendar::-webkit-calendar-picker-indicator {
          filter: invert(1);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default EthiopiaIDVerification;
