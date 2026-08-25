'use client'

/**
 * Issue (or, for a citizen, apply for) a certificate.
 *
 * Three steps, each its own component under ./issue: pick a language, pick a
 * template and fill its fields, then check the rendered page and submit. The
 * state machine is useIssueCertificate and the preview HTML is built by
 * ./issue/draft-html.
 */
import { useMemo } from 'react'
import Modal from '@/components/ui/Modal'
import { useApi } from '@/hooks/useApi'
import { useUser } from '@/hooks/useUser'
import type { CitizenForCert, UnionSettings } from '@/types/certificate.types'
import LanguageStep from './issue/LanguageStep'
import PreviewStep from './issue/PreviewStep'
import StepIndicator from './issue/StepIndicator'
import TemplateStep from './issue/TemplateStep'
import { buildDraftCertificateHtml } from './issue/draft-html'
import { useIssueCertificate } from './issue/useIssueCertificate'

export type { CitizenForCert } from '@/types/certificate.types'

interface Props {
  open: boolean
  onClose: () => void
  citizen: CitizenForCert
  onSuccess: () => void
}

export default function IssueCertificateModal({ open, onClose, citizen, onSuccess }: Props) {
  const { data: settings } = useApi<UnionSettings>('/api/system-settings')
  const currentUser = useUser()
  const isCitizen = currentUser?.role === 'citizen'

  const issue = useIssueCertificate(citizen, onSuccess)

  const previewHtml = useMemo(
    () =>
      buildDraftCertificateHtml({
        template: issue.selectedTemplate,
        citizen,
        info: issue.certificateInfo,
        dynamicData: issue.dynamicData,
        settings,
        language: issue.language,
      }),
    [issue.selectedTemplate, citizen, issue.certificateInfo, issue.dynamicData, settings, issue.language],
  )

  const handleClose = () => {
    issue.reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isCitizen ? 'Apply for Certificate' : 'Issue New Certificate'}
      size="lg"
    >
      <StepIndicator current={issue.step} />

      {issue.step === 'language' && (
        <LanguageStep
          language={issue.language}
          onChange={issue.chooseLanguage}
          onCancel={handleClose}
          onContinue={issue.goToTemplateStep}
        />
      )}

      {issue.step === 'template' && (
        <TemplateStep
          citizen={citizen}
          language={issue.language}
          templates={issue.templates}
          loading={issue.templatesLoading}
          selectedTemplate={issue.selectedTemplate}
          dynamicData={issue.dynamicData}
          onSelectTemplate={issue.selectTemplate}
          onDynamicChange={issue.setDynamicValue}
          onBack={() => issue.setStep('language')}
          onContinue={issue.goToPreviewStep}
        />
      )}

      {issue.step === 'preview' && (
        <PreviewStep
          citizen={citizen}
          template={issue.selectedTemplate}
          info={issue.certificateInfo}
          editing={issue.editingInfo}
          html={previewHtml}
          saving={issue.saving}
          isCitizen={isCitizen}
          onToggleEditing={() => issue.setEditingInfo((current) => !current)}
          onInfoChange={issue.setCertificateInfo}
          onBack={() => issue.setStep('template')}
          onCancel={handleClose}
          onSubmit={issue.submit}
        />
      )}
    </Modal>
  )
}
