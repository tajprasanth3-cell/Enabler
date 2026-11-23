import React, { useState } from 'react';
import { useApp } from '../../context/useApp';
import { motion } from 'framer-motion';
import {
  FiUploadCloud,
  FiFileText,
  FiAlertCircle,
  FiCheckCircle,
  FiLayers,
  FiFilter,
  FiSend,
} from 'react-icons/fi';
import type { Lead } from '../../types';
import StatusBadge from '../../components/common/Badge';

type CsvField = 'candidateName' | 'phone' | 'email' | 'city' | 'education' | 'candidateId';

const CSV_HEADER_ALIASES: Record<string, CsvField> = {
  candidatename: 'candidateName',
  name: 'candidateName',
  phone: 'phone',
  mobile: 'phone',
  email: 'email',
  city: 'city',
  education: 'education',
  candidateid: 'candidateId',
};

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const source = text.replace(/^\uFEFF/, '');

  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (inQuotes) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"' && !field.trim()) {
      field = '';
      inQuotes = true;
    } else if (char === ',') {
      row.push(field.trim());
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[index + 1] === '\n') index++;
      row.push(field.trim());
      if (row.some((value) => value)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  row.push(field.trim());
  if (row.some((value) => value)) rows.push(row);
  return rows;
}

export const LeadIngestion: React.FC = () => {
  const { leads, teams, ingestLeads, allocateStage1AdminToTeams, notify } = useApp();

  // Ingestion Modal / Form State
  const [candidateName, setCandidateName] = useState('');
  const [candidatePhone, setCandidatePhone] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidateCity, setCandidateCity] = useState('');
  const [candidateEducation, setCandidateEducation] = useState('');
  const [uploadResult, setUploadResult] = useState<{ added: number; duplicates: number } | null>(
    null
  );
  const [csvError, setCsvError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // Stage 1 Allocation Modal State
  const [showAllocModal, setShowAllocModal] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState<string[]>(teams.map((t) => t.id));
  const [leadsPerTeam, setLeadsPerTeam] = useState<number>(5);
  const [allocMethod, setAllocMethod] = useState<'EQUAL' | 'WORKLOAD_BASED'>('EQUAL');
  const [allocationError, setAllocationError] = useState<string | null>(null);

  // Filter state
  const [filterTeam, setFilterTeam] = useState<string>('ALL');

  const unassignedCount = leads.filter((l) => !l.currentTeamId).length;
  const maxPerTeam = selectedTeams.length ? Math.floor(unassignedCount / selectedTeams.length) : 0;
  const effectiveLeadsPerTeam = Math.min(Math.max(0, leadsPerTeam), maxPerTeam);
  const plannedAllocation = Math.min(selectedTeams.length * effectiveLeadsPerTeam, unassignedCount);

  const handleCsvFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setCsvError(null);
    try {
      const rows = parseCsvRows(await file.text());
      if (rows.length < 2) {
        setCsvError('The file has no data rows. Expected a header row followed by candidate rows.');
        return;
      }

      const fields = rows[0].map((header) =>
        CSV_HEADER_ALIASES[header.trim().toLowerCase().replace(/[^a-z0-9]/g, '')]
      );
      if (!fields.includes('candidateName') || !fields.includes('phone')) {
        setCsvError("CSV must include 'candidateName' (or 'name') and 'phone' columns.");
        return;
      }

      const candidates: Array<Partial<Lead>> = [];
      const errors: string[] = [];
      rows.slice(1).forEach((row, index) => {
        const values: Partial<Record<CsvField, string>> = {};
        fields.forEach((field, columnIndex) => {
          if (field) values[field] = row[columnIndex] ?? '';
        });
        const candidateName = values.candidateName?.trim();
        const phone = values.phone?.trim();
        if (!candidateName || !phone) {
          errors.push(`Row ${index + 2}: missing ${!candidateName ? 'candidateName' : 'phone'}`);
          return;
        }
        candidates.push({
          candidateName,
          phone,
          email: values.email?.trim() || '',
          city: values.city?.trim() || '',
          education: values.education?.trim() || '',
          candidateId: values.candidateId?.trim() || undefined,
        });
      });

      if (!candidates.length) {
        setCsvError(errors.length ? errors.slice(0, 5).join('; ') : 'No valid candidate rows found.');
        return;
      }

      setUploadResult(ingestLeads(candidates));
      setFileName(file.name);
      setCsvError(
        errors.length
          ? `${errors.slice(0, 5).join('; ')}${errors.length > 5 ? ` (+${errors.length - 5} more)` : ''}`
          : null
      );
    } catch {
      setCsvError(`Could not read "${file.name}". Please try another CSV file.`);
    }
  };

  const handleLoadSampleBatch = () => {
    const sampleBatch = [
      { candidateName: 'Vikas Dubey', phone: '+91 98888 11111', email: 'vikas.d@gmail.com', city: 'Noida', education: 'B.Tech' },
      { candidateName: 'Megha Sharma', phone: '+91 98777 22222', email: 'megha.s@outlook.com', city: 'Delhi', education: 'BBA' },
      { candidateName: 'Kunal Singhania', phone: '+91 98666 33333', email: 'kunal.s@yahoo.com', city: 'Mumbai', education: 'B.Com' },
      { candidateName: 'Priya Patel (Existing Duplicate)', phone: '+91 98765 43210', email: 'rahul.v@gmail.com', city: 'Pune', education: 'MBA' },
      { candidateName: 'Aman Deep', phone: '+91 98555 44444', email: 'aman.d@gmail.com', city: 'Chandigarh', education: 'B.Sc' },
      { candidateName: 'Ritu Sen', phone: '+91 98444 55555', email: 'ritu.s@gmail.com', city: 'Kolkata', education: 'MCA' },
    ];

    const res = ingestLeads(sampleBatch);
    setUploadResult(res);
    setCsvError(null);
    setFileName('sample batch');
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateName.trim() || !candidatePhone.trim()) {
      notify('error', 'Candidate name and phone are required.');
      return;
    }

    const res = ingestLeads([
      {
        candidateName,
        phone: candidatePhone,
        email: candidateEmail,
        city: candidateCity,
        education: candidateEducation,
      },
    ]);
    setUploadResult(res);
    setCandidateName('');
    setCandidatePhone('');
    setCandidateEmail('');
    setCandidateCity('');
    setCandidateEducation('');
  };

  const handleExecuteStage1Allocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeams.length || effectiveLeadsPerTeam <= 0) {
      setAllocationError('Select at least one team and a per-team count above zero.');
      return;
    }
    const allocated = allocateStage1AdminToTeams(selectedTeams, effectiveLeadsPerTeam, allocMethod);
    if (allocated <= 0) {
      setAllocationError('Allocation failed. Check the admin pool and your selection, then try again.');
      return;
    }
    setAllocationError(null);
    setShowAllocModal(false);
  };

  const filteredLeads = leads.filter((l) => {
    if (filterTeam === 'ALL') return true;
    if (filterTeam === 'UNASSIGNED') return !l.currentTeamId;
    return l.currentTeamId === filterTeam;
  });

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
        <div>
          <div className="flex items-center gap-2 text-[#2563EB] text-xs font-bold uppercase tracking-wider mb-1">
            <FiUploadCloud className="text-sm" />
            <span>Lead Ingestion & Stage 1 Allocation</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-[#0F172A] tracking-tight">
            Data Ingestion & Team Distribution
          </h1>
          <p className="text-[#64748B] text-sm mt-1">
            Import candidate records from CSV, deduplicate against the pool and within the batch, and distribute to team pools.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setAllocationError(null);
              setShowAllocModal(true);
            }}
            disabled={unassignedCount === 0}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer ${
              unassignedCount > 0
                ? 'shimmer-button text-white'
                : 'bg-[#F1F5F9] text-[#94A3B8] border border-[#E2E8F0] cursor-not-allowed'
            }`}
          >
            <FiSend />
            <span>Allocate to Teams ({unassignedCount} Available)</span>
          </button>
        </div>
      </div>

      {/* Upload & Duplicate Validation Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CSV Ingestion */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
              <FiFileText className="text-[#2563EB]" />
              <span>Bulk Data Upload (CSV Only)</span>
            </h3>
            <span className="text-xs text-[#2563EB] font-semibold bg-[#EFF6FF] px-2.5 py-1 rounded-full border border-[#BFDBFE]">
              Dedupe: Pool + Batch + Candidate ID
            </span>
          </div>

          <div className="border-2 border-dashed border-[#CBD5E1] hover:border-[#2563EB] rounded-2xl p-6 text-center transition-all bg-[#F8FAFC]">
            <FiUploadCloud className="mx-auto text-4xl text-[#2563EB] mb-2" />
            <h4 className="text-sm font-bold text-[#0F172A]">Import Candidate Master File</h4>
            <p className="text-xs text-[#64748B] max-w-md mx-auto mt-1 mb-1 font-medium">
              Choose a .csv or .txt file with a header row. Columns: candidateName (or name), phone, email, city, education, candidateId.
            </p>
            <p className="text-[10px] text-[#94A3B8] font-mono mb-4">
              candidateName,phone,email,city,education,candidateId
            </p>
            <input
              id="lead-csv-file"
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              onChange={handleCsvFileChange}
              className="hidden"
            />
            <label
              htmlFor="lead-csv-file"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl shimmer-button text-white font-bold text-xs cursor-pointer shadow-md transition-all"
            >
              <FiUploadCloud />
              Choose CSV File
            </label>
            {fileName && (
              <p className="text-[11px] text-[#64748B] font-semibold mt-2 truncate">Loaded: {fileName}</p>
            )}
            <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={handleLoadSampleBatch}
                className="px-5 py-2.5 rounded-xl bg-white text-[#2563EB] border border-[#BFDBFE] hover:bg-[#EFF6FF] font-bold text-xs cursor-pointer shadow-xs transition-all"
              >
                Load sample batch (6 records)
              </button>
            </div>
          </div>

          {csvError && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl border bg-[#FEF2F2] border-[#FECACA] text-[#DC2626] text-xs font-medium flex items-start gap-2"
            >
              <FiAlertCircle className="text-base shrink-0" />
              <span className="flex-1">{csvError}</span>
              <button
                onClick={() => setCsvError(null)}
                className="font-bold cursor-pointer"
                aria-label="Dismiss CSV errors"
              >
                ✕
              </button>
            </motion.div>
          )}

          {/* Upload Status Banner */}
          {uploadResult && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium ${
                uploadResult.duplicates > 0
                  ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#D97706]'
                  : 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF]'
              }`}
            >
              <div className="flex items-center gap-2">
                {uploadResult.duplicates > 0 ? (
                  <FiAlertCircle className="text-base text-[#D97706]" />
                ) : (
                  <FiCheckCircle className="text-base text-[#2563EB]" />
                )}
                <span>
                  Successfully ingested <strong>{uploadResult.added}</strong> valid leads.
                  {uploadResult.duplicates > 0 && (
                    <span> Flagged and rejected <strong>{uploadResult.duplicates} duplicate</strong> records.</span>
                  )}
                </span>
              </div>
              <button
                onClick={() => setUploadResult(null)}
                className="text-[#64748B] hover:text-[#0F172A] font-bold"
              >
                ✕
              </button>
            </motion.div>
          )}
        </div>

        {/* Quick Add Single Candidate */}
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
            <span>Quick Add Candidate</span>
          </h3>
          <form onSubmit={handleManualAdd} className="space-y-3 text-xs">
            <div>
              <label className="block text-[#64748B] mb-1 font-semibold">Full Name *</label>
              <input
                type="text"
                required
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="e.g. Alok Verma"
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-medium focus:outline-none focus:border-[#2563EB] focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[#64748B] mb-1 font-semibold">Phone Number *</label>
              <input
                type="text"
                required
                value={candidatePhone}
                onChange={(e) => setCandidatePhone(e.target.value)}
                placeholder="e.g. +91 99888 77665"
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-medium focus:outline-none focus:border-[#2563EB] focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[#64748B] mb-1 font-semibold">Email</label>
              <input
                type="email"
                value={candidateEmail}
                onChange={(e) => setCandidateEmail(e.target.value)}
                placeholder="candidate@email.com"
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-medium focus:outline-none focus:border-[#2563EB] focus:bg-white"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#EFF6FF] hover:bg-[#E0E7FF] text-[#2563EB] font-bold border border-[#BFDBFE] transition-all cursor-pointer shadow-xs"
            >
              Add Candidate
            </button>
          </form>
        </div>
      </div>

      {/* Master Leads Ledger */}
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FiLayers className="text-[#2563EB]" />
            <h3 className="text-base font-bold text-[#0F172A]">Candidate Lead Repository</h3>
            <span className="text-xs text-[#64748B] font-semibold">({leads.length} Total Records)</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <FiFilter className="text-[#64748B]" />
            <span className="text-[#64748B] font-semibold">Filter Team:</span>
            <select
              value={filterTeam}
              onChange={(e) => setFilterTeam(e.target.value)}
              className="bg-white border border-[#E2E8F0] rounded-xl py-1.5 px-3 text-[#0F172A] font-medium focus:outline-none focus:border-[#2563EB]"
            >
              <option value="ALL">All Leads</option>
              <option value="UNASSIGNED">Unassigned Pool ({unassignedCount})</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[#64748B] font-bold bg-[#F8FAFC]">
                <th className="py-3.5 px-3">Lead ID</th>
                <th className="py-3.5 px-3">Candidate Name</th>
                <th className="py-3.5 px-3">Contact</th>
                <th className="py-3.5 px-3">City / Degree</th>
                <th className="py-3.5 px-3">Assigned Team</th>
                <th className="py-3.5 px-3">Assigned BDE</th>
                <th className="py-3.5 px-3">Lifecycle Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-3 px-3 font-mono text-[#64748B]">{lead.id}</td>
                  <td className="py-3 px-3 font-bold text-[#0F172A]">{lead.candidateName}</td>
                  <td className="py-3 px-3 text-[#475569]">
                    <div className="font-semibold text-[#0F172A]">{lead.phone}</div>
                    <div className="text-[10px] text-[#64748B]">{lead.email || '—'}</div>
                  </td>
                  <td className="py-3 px-3 text-[#475569]">
                    <div>{lead.city}</div>
                    <div className="text-[10px] text-[#64748B]">{lead.education}</div>
                  </td>
                  <td className="py-3 px-3 font-bold">
                    {lead.currentTeamName ? (
                      <span className="text-[#2563EB] bg-[#EFF6FF] px-2.5 py-0.5 rounded-full border border-[#BFDBFE]">
                        {lead.currentTeamName}
                      </span>
                    ) : (
                      <span className="text-[#D97706] bg-[#FFFBEB] px-2.5 py-0.5 rounded-full border border-[#FDE68A]">
                        Unassigned Pool
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-[#475569]">
                    {lead.currentBdeName ? (
                      <span className="font-medium text-[#0F172A]">{lead.currentBdeName}</span>
                    ) : (
                      <span className="text-[#64748B] italic">In Team Pool</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={lead.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stage 1 Lead Allocation Modal */}
      {showAllocModal && (
        <div className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="modal-panel bg-white w-full max-w-lg rounded-2xl p-6 border border-[#E2E8F0] shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <FiSend className="text-[#2563EB]" />
                <span>Stage 1: Allocate Leads to Teams</span>
              </h3>
              <button
                onClick={() => setShowAllocModal(false)}
                className="text-[#64748B] hover:text-[#0F172A] text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteStage1Allocation} className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] font-semibold">
                Total Unassigned Leads in Admin Pool: <strong>{unassignedCount}</strong>
              </div>

              <div>
                <label className="block text-[#0F172A] font-bold mb-2">Select Target Teams</label>
                <div className="space-y-2">
                  {teams.map((t) => (
                    <label
                      key={t.id}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] cursor-pointer hover:bg-white transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTeams.includes(t.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTeams((prev) => [...prev, t.id]);
                          } else {
                            setSelectedTeams((prev) => prev.filter((id) => id !== t.id));
                          }
                        }}
                        className="accent-[#2563EB]"
                      />
                      <span className="font-bold text-[#0F172A]">{t.name}</span>
                      <span className="text-[#64748B] text-[11px]">(TL: {t.teamLeadName})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#0F172A] font-bold mb-1">
                    Leads per Team
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={maxPerTeam}
                    value={effectiveLeadsPerTeam}
                    onChange={(e) => setLeadsPerTeam(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-bold focus:outline-none focus:border-[#2563EB] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[#0F172A] font-bold mb-1">
                    Allocation Strategy
                  </label>
                  <select
                    value={allocMethod}
                    onChange={(e) => setAllocMethod(e.target.value as any)}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 text-[#0F172A] font-semibold focus:outline-none focus:border-[#2563EB] focus:bg-white"
                  >
                    <option value="EQUAL">Equal Distribution</option>
                    <option value="WORKLOAD_BASED">Workload-Balanced</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] text-[#64748B] text-[11px]">
                Total allocation: <strong className="text-[#0F172A]">{plannedAllocation}</strong> of{' '}
                {unassignedCount} pooled leads will be distributed into {selectedTeams.length} team
                pool{selectedTeams.length === 1 ? '' : 's'}.
              </div>

              {maxPerTeam === 0 && (
                <p className="text-[11px] font-semibold text-[#D97706]">
                  Add more leads to the admin pool before allocating to the selected teams.
                </p>
              )}

              {allocationError && (
                <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-[11px] font-semibold flex items-start gap-2">
                  <FiAlertCircle className="text-sm shrink-0" />
                  <span>{allocationError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowAllocModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0] text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl shimmer-button text-white text-xs font-bold cursor-pointer shadow-md"
                >
                  Distribute to Teams
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default LeadIngestion;
