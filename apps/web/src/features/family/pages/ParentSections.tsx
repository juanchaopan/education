import { useScrollToHash } from '../../../shared/lib/useScrollToHash';
import { ParentSection } from '../components/ParentSection';
import { AiConsentPanel } from './AiConsentPanel';
import { ChildAccessPanel } from './ChildAccessPanel';
import { FamilyDeletionPanel } from './FamilyDeletionPanel';
import { FamilyExportPanel } from './FamilyExportPanel';
import { LearningSummaryPanel } from './LearningSummaryPanel';
import { ParentPracticePanel } from './ParentPracticePanel';
import { RegistrationKeyPanel } from './RegistrationKeyPanel';

// The parts of the parent space past the overview. Their panels start over
// with each renewed session; export and deletion renew the session themselves
// and keep their state across it. A link from the overview can name one panel
// after a "#", which is brought into view.

export function ChildrenSection({ csrf }: { csrf: string }) {
  useScrollToHash();
  return (
    <ParentSection titleId="children-title" title="孩子">
      <div id="invite">
        <RegistrationKeyPanel key={csrf} csrf={csrf} />
      </div>
      <ChildAccessPanel key={`children-${csrf}`} csrf={csrf} />
    </ParentSection>
  );
}

export function PracticeSection({ csrf }: { csrf: string }) {
  return (
    <ParentSection titleId="practice-title" title="练习安排">
      <ParentPracticePanel key={`practice-${csrf}`} csrf={csrf} />
    </ParentSection>
  );
}

export function LearningSection({ csrf }: { csrf: string }) {
  return (
    <ParentSection titleId="learning-title" title="学习记录">
      <LearningSummaryPanel key={`summary-${csrf}`} csrf={csrf} />
    </ParentSection>
  );
}

export function PrivacySection({ csrf, onDeleted }: { csrf: string; onDeleted: () => void }) {
  useScrollToHash();
  return (
    <ParentSection titleId="privacy-title" title="隐私与数据">
      <div id="ai-consent">
        <AiConsentPanel key={`ai-consent-${csrf}`} csrf={csrf} />
      </div>
      <div id="family-export">
        <FamilyExportPanel csrf={csrf} />
      </div>
      <div id="family-deletion">
        <FamilyDeletionPanel csrf={csrf} onDeleted={onDeleted} />
      </div>
    </ParentSection>
  );
}
