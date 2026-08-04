import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, ArrowLeft, Sparkles, X } from "lucide-react";
import API from "../services/api";
import { useToast } from "../components/ToastProvider";
import { apiMessage } from "../utils/errors";

export default function CreateForm() {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!title.trim()) return setError("Form title is required");
    if (title.trim().length > 200) return setError("Form title must not exceed 200 characters");
    if (description.length > 2000) return setError("Description must not exceed 2000 characters");
    setBusy(true);
    try {
      const { data } = await API.post("/forms/", { title: title.trim(), description: description.trim() });
      toast.success("Form created successfully");
      navigate(`/workspace/forms/${data.id}/builder`);
    } catch (err) {
      const msg = apiMessage(err, "Failed to create form");
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="create-form-page">
      <div className="create-form-backdrop" />
      <div className="create-form-card">
        <div className="create-form-header">
          <div className="create-form-icon">
            <FileText size={20} />
          </div>
          <div>
            <h1>{t('ui.create_new_form', `Create New Form`)}</h1>
            <p>{t('ui.start_with_a_title_add_fields_in_the_bui', `Start with a title. Add fields in the builder.`)}</p>
          </div>
          <Link to="/workspace/forms" className="create-form-close" title={t('ui.cancel', `Cancel`)}>
            <X size={18} />
          </Link>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={submit} noValidate className="create-form-body">
          <div className="field-group">
            <label htmlFor="form-title" className="field-label">{t('ui.form_title', `Form Title`)}<span className="required-star">*</span>
            </label>
            <input
              id="form-title"
              className="field-input"
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('ui.e_g_customer_feedback_survey', `e.g. Customer Feedback Survey`)}
              autoFocus
            />
            <span className="field-hint">{title.length}/200</span>
          </div>

          <div className="field-group">
            <label htmlFor="form-description" className="field-label">{t('ui.description', `Description`)}</label>
            <textarea
              id="form-description"
              className="field-input field-textarea"
              value={description}
              maxLength={2000}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('ui.what_is_this_form_used_for', `What is this form used for?`)}
              rows={4}
            />
            <span className="field-hint">{description.length}/2000</span>
          </div>

          <div className="create-form-actions">
            <Link to="/workspace/forms" className="btn btn-secondary">
              <ArrowLeft size={14} />{t('ui.cancel', `Cancel`)}</Link>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? (
                <><span className="btn-spinner" />{t('ui.creating', `Creating…`)}</>
              ) : (
                <><Sparkles size={14} />{t('ui.create_form', `Create Form`)}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
