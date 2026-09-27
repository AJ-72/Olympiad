/**
 * Creates a Google Forms quiz for Class 3, Chapter 1: Me and My Surroundings.
 * How to use: open https://script.google.com, create a new project,
 * paste this file, then run createQuiz(). The log shows the form links.
 */
function createQuiz() {
  const questions = [
    ["While going to the school, Ajay saw that his shoe sole was peeling off. To whom should he go to repair his shoe?",
      ["Carpenter", "Tailor", "Barber", "Cobbler"], 3],
    ["The voice box helps us to speak, make sound and sing. Where is it found?",
      ["Chest", "Throat", "Head", "Foot"], 1],
    ["Which of the following organs helps to remove waste and extra fluid from our body?",
      ["Lungs", "Heart", "Kidneys", "Liver"], 2],
    ["Mr. Gupta works in a laboratory. He conducts experiments and does research to discover/invent new things. He is a ______.",
      ["Astrologer", "Scientist", "Journalist", "Electrician"], 1],
    ["Which of the following organs covers the windpipe to prevent the entry of food in windpipe while swallowing food?",
      ["Oesophagus", "Epiglottis", "Larynx", "Ear"], 1],
    ["We consume various products of milk. Which among these items is NOT obtained from milk?",
      ["Curd", "Cream", "Butter", "Cereal"], 3],
    ["Anita Kaul designs houses and buildings. She is a/an ______.",
      ["Architect", "Conductor", "Mechanic", "Pilot"], 0],
  ];

  const form = FormApp.create("Class 3 · Chapter 1: Me and My Surroundings")
    .setDescription("Olympiad practice · Test Skills · 7 questions")
    .setIsQuiz(true)
    .setShuffleQuestions(false);
  form.addTextItem().setTitle("Your name").setRequired(true);

  questions.forEach(([title, options, answer], i) => {
    const item = form.addMultipleChoiceItem();
    item.setTitle(`${i + 1}. ${title}`)
      .setChoices(options.map((o, j) =>
        item.createChoice(`(${"ABCD"[j]}) ${o}`, j === answer)))
      .setPoints(1)
      .setRequired(true)
      .setFeedbackForIncorrect(FormApp.createFeedback()
        .setText(`The answer is (${"ABCD"[answer]}) ${options[answer]}.`).build());
  });

  Logger.log("Edit link: " + form.getEditUrl());
  Logger.log("Share link: " + form.getPublishedUrl());
}
