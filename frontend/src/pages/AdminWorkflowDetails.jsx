import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, GitMerge, Settings, Activity, FileText, CheckCircle2, Clock, Users, PlayCircle, Filter } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Card, CardBody } from "../components/ui/Card";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { relativeTime } from "../utils/relativeTime";
import { useState } from "react";

export default function AdminWorkflowDetails() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  // Mocking workflow details fetch based on ID
  const workflow = {
    id: id,
    name: "Employee Onboarding Workflow",
    status: "active",
    owner: "Admin User",
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    last_execution: new Date(Date.now() - 3600000).toISOString(),
    trigger: "New Form Submission",
    assigned_forms: [
      { id: "f1", name: "New Hire Information Form" },
      { id: "f2", name: "IT Equipment Request" }
    ],
    steps: [
      { name: "Employee Submission", type: "trigger", assignee: "Initiator" },
      { name: "Manager Approval", type: "approval", assignee: "Direct Manager" },
      { name: "HR Verification", type: "approval", assignee: "HR Department" },
      { name: "IT Setup", type: "task", assignee: "IT Dept" },
      { name: "Completed", type: "end", assignee: "System" }
    ],
    running_instances: 12,
    total_executions: 1240,
    history: [
      { instance_id: "inst_101", user: "John Doe", status: "completed", date: new Date(Date.now() - 3600000).toISOString() },
      { instance_id: "inst_102", user: "Jane Smith", status: "running", date: new Date(Date.now() - 7200000).toISOString(), current_step: "Manager Approval" },
      { instance_id: "inst_103", user: "Bob Wilson", status: "failed", date: new Date(Date.now() - 86400000).toISOString() }
    ]
  };

  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="dashboard-page" style={{ paddingBottom: 60 }}>
      <button className="btn btn-ghost" onClick={() => navigate("/admin/workflows")} style={{ marginBottom: 16 }}>
        <ArrowLeft size={16} />{t('ui.back_to_workflows', `Back to Workflows`)}</button>

      <PageHeader 
        title={workflow.name} 
        description={`Detailed view, history, and configuration for ${workflow.id}.`}
        eyebrow="Workflow Details"
        action={
          <div style={{ display: 'flex', gap: 12 }}>
            <Badge variant={workflow.status === 'active' ? 'success' : 'default'} style={{ fontSize: 13, padding: '4px 12px' }}>
              {workflow.status.toUpperCase()}
            </Badge>
            <button className="btn btn-secondary">
              <Settings size={16} />{t('ui.configure', `Configure`)}</button>
          </div>
        }
      />

      <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-subtle)', flex: 1 }}>
          <button 
            className={`btn btn-ghost ${activeTab === 'overview' ? 'active' : ''}`}
            style={{ borderRadius: 0, borderBottom: activeTab === 'overview' ? '2px solid var(--brand-500)' : '2px solid transparent' }}
            onClick={() => setActiveTab("overview")}
          >{t('ui.overview_flow', `Overview & Flow`)}</button>
          <button 
            className={`btn btn-ghost ${activeTab === 'history' ? 'active' : ''}`}
            style={{ borderRadius: 0, borderBottom: activeTab === 'history' ? '2px solid var(--brand-500)' : '2px solid transparent' }}
            onClick={() => setActiveTab("history")}
          >{t('ui.execution_history', `Execution History`)}</button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Complete Flow Visualization */}
            <Card>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <GitMerge size={18} style={{ color: 'var(--brand-600)' }} />
                <h3 style={{ margin: 0, fontSize: 16 }}>{t('ui.approval_chain_flow', `Approval Chain & Flow`)}</h3>
              </div>
              <CardBody>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 20, bottom: 20, left: 31, width: 2, background: 'var(--border-subtle)', zIndex: 0 }} />
                  {workflow.steps.map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: 24, position: 'relative', zIndex: 1, padding: '16px 0' }}>
                      <div style={{ width: 64, display: 'flex', justifyContent: 'center' }}>
                        <div style={{ 
                          width: 32, height: 32, borderRadius: '50%', 
                          background: step.type === 'trigger' ? 'var(--success-100)' : step.type === 'end' ? 'var(--gray-200)' : 'var(--brand-100)', 
                          color: step.type === 'trigger' ? 'var(--success-600)' : step.type === 'end' ? 'var(--gray-600)' : 'var(--brand-600)', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13,
                          boxShadow: '0 0 0 4px white'
                        }}>
                          {i + 1}
                        </div>
                      </div>
                      <div style={{ flex: 1, padding: '16px', background: 'var(--gray-50)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: 15, color: 'var(--text-primary)' }}>{step.name}</strong>
                          <Badge variant="default" style={{ fontSize: 11, textTransform: 'capitalize' }}>{step.type}</Badge>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, color: 'var(--text-secondary)', fontSize: 13 }}>
                          <Users size={14} />{t('ui.assignee', `Assignee:`)}<strong>{step.assignee}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Card>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                <h3 style={{ margin: 0, fontSize: 15 }}>{t('ui.workflow_details', `Workflow Details`)}</h3>
              </div>
              <CardBody>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>{t('ui.trigger_condition', `Trigger Condition`)}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>
                      <PlayCircle size={16} style={{ color: 'var(--success-500)' }} /> {workflow.trigger}
                    </div>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>{t('ui.owner', `Owner`)}</span>
                    <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>{workflow.owner}</strong>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>{t('ui.created', `Created`)}</span>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{relativeTime(workflow.created_at)}</span>
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>{t('ui.last_execution', `Last Execution`)}</span>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{relativeTime(workflow.last_execution)}</span>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                <h3 style={{ margin: 0, fontSize: 15 }}>{t('ui.assigned_forms', `Assigned Forms (`)}{workflow.assigned_forms.length})</h3>
              </div>
              <CardBody noPadding>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {workflow.assigned_forms.map(form => (
                    <div key={form.id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <FileText size={16} style={{ color: 'var(--brand-500)' }} />
                      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{form.name}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <Card>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>{t('ui.execution_history', `Execution History`)}</h3>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('ui.total_executions', `Total Executions:`)}<strong>{workflow.total_executions}</strong></span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('ui.running', `Running:`)}<strong>{workflow.running_instances}</strong></span>
            </div>
          </div>
          <CardBody noPadding>
            <Table>
              <TableHeader headers={["Instance ID", "Triggered By", "Status", "Current Step", "Date"]} />
              <TableBody>
                {workflow.history.map(hist => (
                  <TableRow key={hist.instance_id}>
                    <TableCell><strong style={{ fontFamily: 'monospace' }}>{hist.instance_id}</strong></TableCell>
                    <TableCell>{hist.user}</TableCell>
                    <TableCell>
                      <Badge variant={hist.status === 'completed' ? 'success' : hist.status === 'failed' ? 'danger' : 'brand'}>
                        {hist.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{hist.current_step || "—"}</TableCell>
                    <TableCell>{relativeTime(hist.date)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
