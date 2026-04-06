export default function FBQuestion({ question, answer, checked, grading, onAnswerChange, onCheck, t, translateAllOn, questionTranslations, questionIndex }) {
  return (
    <div className="comprehension__fb">
      <div className="comprehension__fb-bank">
        {(question.bank || []).map(word => {
          const isSelected = answer === word;
          const isCorrectAnswer = word === question.correctAnswer;
          let chipClass = 'comprehension__fb-chip';
          if (isSelected) chipClass += ' comprehension__fb-chip--selected';
          if (checked && isSelected && isCorrectAnswer) chipClass += ' comprehension__fb-chip--correct';
          if (checked && isSelected && !isCorrectAnswer) chipClass += ' comprehension__fb-chip--incorrect';
          if (checked && !isSelected && isCorrectAnswer) chipClass += ' comprehension__fb-chip--correct';
          if (checked) chipClass += ' comprehension__fb-chip--disabled';
          const fbTranslation = translateAllOn ? questionTranslations?.[`bank-${questionIndex}-${word}`] : null;
          return (
            <button
              key={word}
              className={chipClass}
              onClick={() => !checked && onAnswerChange(word)}
              disabled={checked || grading}
              title={fbTranslation || undefined}
            >
              {word}
              {fbTranslation && <span className="comprehension__option-translation">{fbTranslation}</span>}
            </button>
          );
        })}
      </div>
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
            : t('comprehension.incorrectFB', { answer: question.correctAnswer })}
        </p>
      )}
    </div>
  );
}
