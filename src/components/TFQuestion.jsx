export default function TFQuestion({ question, answer, checked, grading, onAnswerChange, onCheck, t, tfTrue, tfFalse }) {
  return (
    <div className="comprehension__tf-options">
      {['T', 'F'].map(val => {
        const isSelected = answer === val;
        const isCorrectAnswer = val === question.correctAnswer;
        let optClass = 'comprehension__tf-option';
        if (isSelected) optClass += ' comprehension__tf-option--selected';
        if (checked && isSelected && isCorrectAnswer) optClass += ' comprehension__tf-option--correct';
        if (checked && isSelected && !isCorrectAnswer) optClass += ' comprehension__tf-option--incorrect';
        if (checked && !isSelected && isCorrectAnswer) optClass += ' comprehension__tf-option--correct';
        if (checked) optClass += ' comprehension__tf-option--disabled';
        return (
          <button
            key={val}
            className={optClass}
            onClick={() => !checked && onAnswerChange(val)}
            disabled={checked || grading}
          >
            {val === 'T' ? tfTrue : tfFalse}
          </button>
        );
      })}
      {!checked && answer && (
        <button
          className="btn btn-primary btn-xs comprehension__mc-check"
          onClick={onCheck}
        >
          {t('comprehension.checkAnswer')}
        </button>
      )}
      {checked && (
        <p className={`comprehension__mc-feedback ${answer === question.correctAnswer ? 'comprehension__mc-feedback--correct' : 'comprehension__mc-feedback--incorrect'}`}>
          {answer === question.correctAnswer
            ? t('comprehension.correct')
            : t('comprehension.incorrectTF', { answer: question.correctAnswer === 'T' ? tfTrue : tfFalse })}
        </p>
      )}
    </div>
  );
}
