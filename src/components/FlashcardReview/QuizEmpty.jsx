import { useT } from '../../i18n';

export default function QuizEmpty({ className, messageKey }) {
  const t = useT();
  return (
    <div className={className}>
      <p className="text-muted">{t(messageKey)}</p>
    </div>
  );
}
