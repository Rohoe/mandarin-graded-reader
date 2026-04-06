export default function MCQuestion({ question, answer, checked, grading, onAnswerChange, onCheck, t, translateAllOn, questionTranslations, questionIndex }) {
  return (
    <div className="comprehension__mc-options">
      {(question.options || []).map(opt => {
        const letter = opt.charAt(0);
        const isSelected = answer === letter;
        const isCorrectAnswer = letter === question.correctAnswer;
        let optClass = 'comprehension__mc-option';
        if (isSelected) optClass += ' comprehension__mc-option--selected';
        if (checked && isSelected && isCorrectAnswer) optClass += ' comprehension__mc-option--correct';
        if (checked && isSelected && !isCorrectAnswer) optClass += ' comprehension__mc-option--incorrect';
        if (checked && !isSelected && isCorrectAnswer) optClass += ' comprehension__mc-option--correct';
        if (checked) optClass += ' comprehension__mc-option--disabled';
        return (
          <label key={letter} className={optClass}>
            <input
              type="radio"
              name={`mc-${questionIndex}`}
              value={letter}
              checked={isSelected}
              onChange={() => onAnswerChange(letter)}
              disabled={checked || grading}
            />
            <span>
              {opt}
              {translateAllOn && questionTranslations?.[`opt-${questionIndex}-${letter}`] && (
                <span className="comprehension__option-translation">{questionTranslations[`opt-${questionIndex}-${letter}`]}</span>
              )}
            </span>
          </label>
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
            : t('comprehension.incorrect', { answer: question.correctAnswer })}
        </p>
      )}
    </div>
  );
}
