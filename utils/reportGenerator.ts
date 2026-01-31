
import { Patient, StabilityReport } from '../types';

export const generatePatientReport = (patient: Patient) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to generate the report.');
    return;
  }

  const sortedReports = [...(patient.reports || [])].reverse();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Medical Discharge Report - ${patient.name}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; padding: 40px; }
        .header { text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #1e3a8a; margin: 0; font-size: 28px; }
        .header p { color: #6b7280; font-size: 14px; margin: 5px 0 0; }
        
        .section { margin-bottom: 25px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; page-break-inside: avoid; }
        .section-header { background: #f3f4f6; padding: 10px 20px; font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb; }
        .section-body { padding: 15px 20px; }
        
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .field { margin-bottom: 5px; }
        .label { font-size: 12px; color: #9ca3af; text-transform: uppercase; font-weight: bold; display: block; }
        .value { font-size: 16px; font-weight: 500; }
        
        table { w-full; border-collapse: collapse; margin-top: 10px; width: 100%; }
        th { text-align: left; background: #f9fafb; padding: 10px; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
        td { padding: 10px; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
        
        .status-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
        .status-Stable { background: #d1fae5; color: #059669; }
        .status-Watch { background: #fef3c7; color: #d97706; }
        .status-Critical { background: #ffe4e6; color: #e11d48; }

        .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${patient.hospitalName || 'Health Smart Hospital'}</h1>
        <p>Post-Operative Recovery Discharge Report</p>
        <p>Generated on: ${new Date().toLocaleString()}</p>
      </div>

      <div class="section">
        <div class="section-header">Patient Demographics</div>
        <div class="section-body">
          <div class="grid">
            <div class="field"><span class="label">Name</span><span class="value">${patient.name}</span></div>
            <div class="field"><span class="label">Dashboard ID</span><span class="value">${patient.id}</span></div>
            <div class="field"><span class="label">Age</span><span class="value">${patient.age}</span></div>
            <div class="field"><span class="label">Primary Condition</span><span class="value">${patient.reasonForMonitoring}</span></div>
            <div class="field"><span class="label">Contact</span><span class="value">${patient.mobileNumber}</span></div>
            <div class="field"><span class="label">Registration Date</span><span class="value">${new Date(patient.createdAt).toLocaleDateString()}</span></div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-header">Clinical Summary</div>
        <div class="section-body">
          <div class="field"><span class="label">Final Status</span><span class="value status-badge status-${patient.status}">${patient.status}</span></div>
          <div class="field" style="margin-top: 15px;"><span class="label">Active Monitoring Modules</span>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 5px;">
              ${Object.entries(patient.monitoringConfig)
      .filter(([_, v]) => v)
      .map(([k, _]) => `<span style="background:#eff6ff; color:#2563eb; padding:2px 8px; border-radius:4px; font-size:12px; font-weight:bold; text-transform:uppercase;">${k}</span>`)
      .join('')}
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-header">Recovery Timeline (${sortedReports.length} Entries)</div>
        <div class="section-body">
          <table>
            <thead>
              <tr>
                <th>Date / Time</th>
                <th>Type</th>
                <th>Status</th>
                <th>AI Analysis / Clinical Feedback</th>
              </tr>
            </thead>
            <tbody>
              ${sortedReports.map(report => `
                <tr>
                  <td style="white-space: nowrap; color: #6b7280;">${new Date(report.timestamp).toLocaleString()}</td>
                  <td><strong>${report.reportType || 'STABILITY'}</strong></td>
                  <td><span class="status-badge status-${report.status}">${report.status}</span></td>
                  <td>${report.aiAnalysis || 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ${sortedReports.length === 0 ? '<p style="text-align:center; color:#9ca3af; padding:20px;">No reports recorded during monitoring period.</p>' : ''}
        </div>
      </div>

      <div class="footer">
        <p>This report is electronically generated by the Health Smart Monitoring System.</p>
        <p>Hospital ID: ${patient.hospitalId} | Patient Ref: ${patient.id}</p>
      </div>

      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};
