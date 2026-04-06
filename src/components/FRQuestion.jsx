export default function FRQuestion({ answer, grading, onAnswerChange, t }) {
  return (
    <textarea
      className="comprehension__answer"
      placeholder={t('comprehension.typeAnswer')}
      value={answer || ''}
      onChange={e => onAnswerChange(e.target.value)}
      disabled={grading}
    />
  );
}
