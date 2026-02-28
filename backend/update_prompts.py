import re
import json

app_js_path = '/Users/chautran/Documents/DATS 5750/module 7/_homework/_code/mindful-life-ai/frontend/app.js'

original = [
    "What is something you need to let go of?",
    "What are you most grateful for today?",
    "How have you grown in the last year?",
    "What would you do if you knew you couldn't fail?",
    "What boundary do you need to set or enforce?",
    "Describe your ideal day from morning to night.",
    "What is a belief you hold that is no longer serving you?",
    "What are three things you love about yourself?",
    "Write a letter to your younger self.",
    "Write a letter to your future self.",
    "What is your biggest fear, and why?",
    "What brings you the most joy right now?",
    "What is a challenge you recently overcame?",
    "How can you be kinder to yourself?",
    "What does success look like to you?",
    "What is a habit you want to start or stop?",
    "Describe a moment when you felt truly alive.",
    "What are you avoiding right now?",
    "Who is someone you admire, and what qualities do they have?",
    "What would make today great?",
    "What did you learn today?",
    "How are you feeling physically, emotionally, and mentally?",
    "What is a goal you have for this month?",
    "What is a memory that makes you smile?",
    "What do you need more of in your life?",
    "What do you need less of in your life?"
]

tnh = [
    "As you breathe in and out right now, what sensations do you notice?",
    "Where did you find a moment of true peace and stillness today?",
    "How can you look deeply into the suffering of a person you encountered today to cultivate compassion?",
    "What is a beautiful, simple thing in the present moment that you might be overlooking?",
    "How can you apply mindful awareness to a task you usually rush through?"
]

reddit_raw = """
1. Are you taking enough risks in your life? Would you like to change your relationship to risk? If so, how?
2. At what point in your life have you had the highest self-esteem?
3. Consider and reflect on what might be your “favorite failure.”
4. Draw 25 circles on a page (5x5 grid of circles). Now set a timer for 3 minutes and try to turn each one into something unique. Could be a ball, hand cuffs, a logo, or an eye for instance.
5. Draw a small scribble on the page then use your imagination to turn that scribble into a full drawing.
6. Find two unrelated objects near you and think of a clever way they might be used together.
7. How can you reframe one of your biggest regrets in life?
8. How did you bond with one of the best friends you’ve ever had?
9. How did your parents or caregivers try to influence or control your behavior when you were growing up?
10. How do the opinions of others affect you?
11. How do you feel about asking for help?
12. How much do your current goals reflect your desires vs someone else’s?
13. If you could eliminate any one disease or illness from the world, what would you choose and why?
14. Imagine that you have arrived at a closed door. What does it look like and what’s on the other side?
15. In what ways are you currently self-sabotaging or holding yourself back?
16. Invent your own planet. Draw a rough sketch of the planet and its inhabitants. How is it different than Earth?
17. React to the following quote from Anaïs Nin: “We don't see things as they are, we see them as we are.”
18. React to the following quote from We All Looked Up by Tommy Wallach: “Do you think it is better to fail at something worthwhile, or to succeed at something meaningless?”
19. Take a task that you’ve been dreading and break it up into the smallest possible steps.
20. Talk about a time that you are proud to have told someone “no.”
21. The world would be a lot better if…
22. Think about a “what if?” or worst-case scenario and work your way through the problem, identifying your options to get through it if it were to happen.
23. Think about the last time you cried. If those tears could talk, what would they have said?
24. What are some small things that other people have done that really make your day?
25. What are some things that frustrate you? Can you find any values that explain why they bug you so much?
26. What are some things that you could invest more money in to make life smoother and easier for yourself?
27. What biases do you need to work on?
28. What could you do to make your life more meaningful?
29. What did you learn from your last relationship? If you haven’t had one, what could you learn from a relationship that you’ve observed?
30. What do you need to give yourself more credit for?
31. What do you wish you could do more quickly? What do you wish you could do more slowly?
32. What does “ready” feel like to you? How did you know you were ready for a major step that you have taken in your life?
33. What happens when you are angry?
34. What is a boundary that you need to draw in your life?
35. What is a made-up rule about your life that you are applying to yourself? How has this held you back and how might you change it?
36. What is a positive habit that you would really like to cultivate? Why and how could you get started?
37. What is a question that you are really scared to know the answer to?
38. What is a reminder that you would like to tell yourself next time you are in a downward spiral?
39. What is a view about the world that has changed for you as you’ve gotten older?
40. What is holding you back from being more productive at the moment? What can you do about that?
41. What is something that you grew out of that meant a lot to you at the time?
42. What is something that you have a hard time being honest about, even to those you trust the most? Why?
43. What life lessons, advice, or habits have you picked up from fiction books?
44. What made you feel most alive when you were young?
45. What part of your work do you most enjoy? What part do you least enjoy? Why?
46. What pet peeves do you have? Any idea why they drive you so crazy?
47. What sensations or experience do you tend to avoid in your life? Why?
48. What was a seemingly inconsequential decision that made a big impact in your life?
49. What would you do if you could stop time for two months?
50. When was the last time you had to hold your tongue? What would you have said if you didn't have to?
51. Which emotions in others do you have a difficult time being around? Why?
52. Which quotes or pieces of advice do you have committed to memory? Why have those stuck with you?
53. Which songs have vivid memories for you?
54. Who has been your greatest teacher?
55. Who is somebody that you miss? Why?
56. Who is the most difficult person in your life and why?
57. Why do you dress the way that you do?
58. Write a complete story with just six words. For example: Turns out the pain was temporary.
59. Write a letter to someone you miss dearly.
60. Write a letter to your own body, thanking it for something amazing it has done.
61. Write a thank you note to someone. Sending is optional.
62. Write about a mistake that taught you something about yourself.
63. Write about an aspect of your personality that you appreciate in other people as well.
64. Write about something (or someone) that is currently tempting you.
65. Write about something that you would like to let go of.
66. Write an apology to yourself for a time you treated yourself poorly.
67. You have been temporarily blinded by a bright light. When your vision clears, what do you see?
"""

camille_raw = """
What are three great things that happened yesterday?
What are 10 things that bring you joy?
What are you looking forward to right now? If you can’t think of anything, what can you do to change that?
What is one totally-free thing that’s transformed your life?
What things in your life would you describe as priceless?
What are 10 things you’re actively enjoying about life right now?
Write about the most fun you had recently. What were you doing and who were you with?
Write about an act of kindness that someone did for you that took you by surprise.
What are some of your favorite ways to show the people in your life that you love them?
Reflect on a moment of profound beauty that you recently experienced. What about it surprised you and drew you in?
In this moment, what are three things in your life that you feel the most grateful for?
Write five guilty pleasures you don’t feel guilty about.
In what ways have you felt supported by friends, family, or you community recently?
Name three healthy habits you started within the last year that have changed your life for the better.
Describe your space. What do you love about it?
What are your favorite things to eat?
What are three small, seemingly insignificant moments from the past week that brought you joy?
Write about someone who inspires you. What qualities do they have that you admire?
What are five things your younger self would be amazed by or proud of in your life now?
Describe a recent challenge you overcame. What did it teach you, and how are you stronger because of it?
Name the top three emotions you are feeling at the moment. What are the emotions you want to feel today?
What is the one thing you would tell your teenage self if you could?
What is your body craving at the moment?
What are 10 questions you wish you had the answers to right now?
What do you know to be true today that you didn’t know a year ago?
What are you scared of right now?
What’s not working in your life right now?
Write about someone you miss. What do you miss about them? How do they make you feel?
Picture someone who you’ve experienced a conflict with in the past and try to drop into their perspective. What were they feeling at the time of your conflict? If it’s available to you, how can you express sympathy for their experience?
What areas of your life are causing you stress? What areas of your life are bringing you joy?
What would you describe as being the greatest accomplishment of your life so far?
If someone was to describe your life story back to you, which three events would you want them to highlight the most?
What has been the most transformative year in your life so far?
What is your earliest childhood memory?
How has your relationship to self-love grown and strengthened over the past five years?
What have you learned to forgive yourself for?
What does your ideal day look like, from start to finish? What steps can you take today to make it feel more like that?
When was the last time you felt truly at peace with yourself? What made that moment possible?
What is one fear you’ve faced in the past that you are proud of overcoming?
If you could change one thing about the way you show up in the world, what would it be, and why?
Describe your perfect home. Where is it, what does it look like, and who do you share it with?
When you were younger, what did you want to be when you grew up and why?
If failure wasn’t possible, what would you be doing right now?
If you only had one year left of life, what would you do?
In another life, who would you want to be? Write out this character, what they do for a living, their personality traits, etc.
Reflect on your career and personal goals. Are there parallels and consistencies between the two? How do you keep these two areas of your life separate? How are they the same?
If you could master one skill, what would it be?
What are new ways you can measure progress this year?
What is standing in your way of reaching your goals?
Who are the people you trust the most to help you create the life you’ve always dreamed of?
What habits and actions can you incorporate into your daily routine to help you prioritize your time in 2025?
What would it feel like to step out of your comfort zone? How can you step out of your comfort zone more this year?
What talents or skills do you want to build and strengthen?
What challenges have you overcome in the past? How has doing so made your life more vibrant and full?
What’s a commitment you can make to yourself every day to grow more this year?
What is the one thing you’ve always wanted to achieve but haven’t yet? What steps can you take today to move closer to it?
What does success look like to you right now? How has your definition of success evolved over the years?
What are three specific goals you’d like to accomplish this year, and how can you break them down into manageable steps?
What would you do if you felt completely fearless? How can you embrace that boldness in your current life?
What’s one big dream you’ve been putting off? What’s the first step you can take today to move closer to making it a reality?
What top three qualities do you value most in life?
In what ways are you acting outside of those values?
In what ways are you acting in alignment with them?
What do you want to invite more of into 2025?
What do you want to leave behind?
What’s something you wish others knew about you?
Who is someone you admire? What qualities do you love about them?
What are you looking forward to this week?
Who is someone you envy and why?
What distracts you from what’s truly important each day?
If you decided right now that you had enough money, and that you would always have enough, what would you do with your life?
When you picture yourself 10 years from now, what do you want to have achieved and experienced?
How do you want to contribute your talents and passions to the world? Who could be touched by you and how would it affect them?
What role does love play in your life?
What does friendship mean to you?
How did you prioritize your time today?
What does living authentically look like to you, and how can you bring more of that into your daily life?
What are the core beliefs that guide your decisions? How do they shape your relationships and goals?
In what ways can you practice kindness, both toward yourself and others, more intentionally
How do you define balance in your life, and what actions can you take to bring more of it into your routine?
"""

legacy_raw = """
1. What is something unexpected that happened to you recently? How did it impact you?
2. What does love mean to you? How would you describe it to someone else?
3. What was one of the best days of your life, and why? Also, what was one of the worst?
4. What are five small moments that you were grateful for in the past week?
5. What was one of the scariest moments of your life, and why was it scary?
6. How did you come to live at your current residence, and why are you living here?
7. How do you define personal success, and how do you plan to achieve it?
8. How will you enjoy retirement when you no longer want to work?
9. How has the past year treated you? What can you do to make this year better?
10. How have your current habits been serving you? Are there any that need to change?
11. Why are you hesitating to take the next step on a personal project? What do you need to move forward?
12. Why is your current lifestyle satisfactory? If it isn't, why not?
13. Why are you working at your job? How can you make your job better serve your needs?
14. Why should someone invest in you today? What do you want to accomplish?
15. Why haven't you taken a risk recently? What do you need to take a calculated risk?
16. Who has had the greatest influence on your life? What did they do?
17. Who is pushing you to be the best version of yourself? Who is sabotaging your efforts?
18. Who has done a recent act of kindness for you? Who can you do a random act of kindness to today?
19. Who is your personal role model? Why are they your role model?
20. Who has invested in your well-being recently? Who could you invest in?
21. When life gets overwhelming, what do you do to regain composure?
22. When was the last time you did an activity for only yourself? When can you do so again?
23. When did you last take a significant risk? What was it and why did you do it?
24. When was the last time you were genuinely curious?
25. When do you reflect on your life? Do you regularly schedule a time to reflect?
26. What is your favorite time of the day and why?
27. How did you meet your first best friend? What are they up to now?
28. When have you exceeded your expectations? What did you do?
29. Of all living people, who would you most like to have a three-hour dinner with?
30. Are you a spender or a saver? Why?
31. Life is too short to tolerate __________________.
32. If you could get rid of any one bad habit, what would it be?
33. Describe a fear you overcame and how you did so.
34. What is the most valuable lesson you have learned? Who taught it to you?
35. If you could have any career, what would it be and why?
36. What do you wish you were the best at?
37. How has fear held you back?
38. What would you do if you were 10 times more confident?
39. Write down an interesting, insightful, or inspiring insight that changed your mind.
40. List down three goals you want to achieve within the next three months.
41. What is something unique about you that no one knows? Why haven't you shared it?
42. Have you ever had a nickname? What is it and how did you earn the name?
43. What is your biggest regret?
44. What is your greatest accomplishment?
45. Journal about your favorite artist, author, or creator. Why do you enjoy their work?
46. How would you behave if you didn't care about other people's expectations?
47. Other than money, what have you gained from your current job?
48. Who has made you laugh recently? What did they do to make you laugh?
49. List your favorite foods, drinks, snacks, desserts, and more. When was the last time you got to enjoy one of them with a friend?
50. Create a motto for your life.
51. When was the last time you overcame a difficult obstacle? How did you beat it?
52. Have you taken a day to disconnect from responsibilities? When was the last time you did so?
53. If you had a magic wand to solve any one problem, what would it be and how would your life change?
54. If you were unapologetically loved and accepted by yourself, what would change moving forward?
55. What are you the best at? What do you love doing the most? How could you spend more time engaging in both activities?
56. What makes your heart happy? What gives you the greatest thrills?
57. What do you believe is holding you back in your life? What could you do to change it to serve you?
58. Where do you see yourself in three months, six months, nine months, and twelve months? Be specific.
59. What are your top five memories? Why do they hold a special place in your mind?
60. How would your life change if you woke up and stopped worrying about your past and your future?
61. What scares you the most and why? How can you tackle this fear so it controls less of your life?
62. If you could go back in time and tell yourself one piece of advice, what would it be?
63. What are three things you are looking forward to doing this week? Why?
64. Who do you need to forgive? What's stopping you from doing so today?
65. What opportunities do you have in front of you right now? What's making you hesitate to decide?
66. How would you like to be remembered when you are gone?
67. What energizes you? What drains you? How can you maximize your energizers and limit your drainers?
68. What is an assumption about yourself or the world that has been holding you back?
69. What is something that is worrying you at the moment? How have you tried to address it?
70. What was the last book you read? What about it was interesting or useful?
71. If you were happier, how would people know?
72. List five people you spend the most time with in your day-to-day life. How are these people helping you grow or live a fulfilling life?
73. What do you like about yourself? Why do you like these aspects?
74. What advice would you give to a random stranger?
75. When did you last spend time with your family or a close friend?
76. If there were no limits or obstacles in your way, journal about where would you be in 10 years.
77. When was the last time you were seriously sick? How did you heal yourself?
78. When was the last time you tried something you were not good at? How did it go?
79. What are you settling for in your life right now? How could you change that?
80. Journal about one controversial belief you hold and why you hold firm to it.
81. What is something you don't want anyone to know about you and why?
82. List your favorite activities as a child. When did you engage one of those activities? If not now, then when?
83. What is the last thing you've done that is worth remembering?
84. When you are 80 years old what will matter to you most?
85. Write about your last intense encounter and why was it fulfilling or nerve-wracking.
86. Would you break the law to hold to a personal value? What value and why?
87. If you could brainwash someone into believing something what would it be and why?
88. What would you require to be taught in schools if you were in charge of national education?
89. Which is worse, never making an attempt or failing while trying?
90. When was the last time you meditated or took a moment to focus on your surroundings?
91. What does the American Dream mean to you and how are you achieving it?
92. What is the most desirable trait that another person can possess?
93. How would you describe a good leader? How would you describe the good follower?
94. Are you more worried about doing things right or doing the right things? Journal about it.
95. What is one lie you believed for most of your life?
96. How would you describe yourself to a stranger?
97. Reflect on a moment when you stood up for yourself. What was the result?
98. What were you like as a 7-year-old?
99. List 3 counterintuitive truths. "Most people think ______________, but the truth is ________________."
100. Describe your ideal vacation in detail. If you could give a gift to anyone, what gift would you give and why?
"""

stoic_raw = """
1. It’s not what happens to you, but how you react to it that matters.
2. He who laughs at himself never runs out of things to laugh at.
3. Only the educated are free.
4. Some things are in our control and others not. Things in our control are opinion, pursuit, desire, aversion, and, in a word, whatever are our own actions. Things not in our control are body, property, reputation, command, and, in one word, whatever are not our actions.
5. The greater the difficulty, the more glory in surmounting it. Skillful pilots gain their reputation from storms and tempests.
6. He is a wise man who does not grieve for the things which he has not, but rejoices for those which he has.
7. Seek not the good in external things; seek it in yourselves.
8. People are not disturbed by things, but by the views they take of them.
9. If anyone tells you that a certain person speaks ill of you, do not make excuses about what is said of you but answer, “He was ignorant of my other faults, else he would not have mentioned these alone.”
10. Any person capable of angering you becomes your master; he can anger you only when you permit yourself to be disturbed by him.
11. Wealth consists not in having great possessions, but in having few wants.
12. Don’t explain your philosophy. Embody it.
13. To accuse others for one’s own misfortune is a sign of want of education. To accuse oneself shows that one’s education has begun. To accuse neither oneself nor others shows that one’s education is complete.
14. There is only one way to happiness and that is to cease worrying about things which are beyond the power or our will.
15. If you want to improve, be content to be thought foolish and stupid.
16. The key is to keep company only with people who uplift you, whose presence calls forth your best.
17. If you would be a reader, read; if a writer, write.
18. God has entrusted me with myself. No man is free who is not master of himself. A man should so live that his happiness shall depend as little as possible on external things. The world turns aside to let any man pass who knows where he is going.
19. Remember, it is not enough to be hit or insulted to be harmed, you must believe that you are being harmed. If someone succeeds in provoking you, realize that your mind is complicit in the provocation. Which is why it is essential that we not respond impulsively to impressions; take a moment before reacting, and you will find it easier to maintain control.
20. A ship should not ride on a single anchor, nor life on a single hope.
21. Demand not that things happen as you wish, but wish them to happen as they do, and you will go on well.
22. Remember that you ought to behave in life as you would at a banquet. As something is being passed around it comes to you; stretch out your hand, take a portion of it politely. It passes on; do not detain it. Or it has not come to you yet; do not project your desire to meet it, but wait until it comes in front of you. So act toward children, so toward a wife, so toward office, so toward wealth.
23. Events do not just happen, but arrive by appointment.
24. Either God wants to abolish evil, and cannot; or he can, but does not want to.
25. It is unrealistic to expect people to see you as you see yourself.
26. You have power over your mind — not outside events. Realize this, and you will find strength.
27. The soul becomes dyed with the colour of its thoughts.
28. Do not act as if you were going to live ten thousand years. Death hangs over you. While you live, while it is in your power, be good.
29. Dwell on the beauty of life. Watch the stars, and see yourself running with them. Think constantly on the changes of the elements into each other, for such thoughts wash away the dust of earthly life.
30. The impediment to action advances action. What stands in the way becomes the way.
31. If it is not right do not do it; if it is not true do not say it.
32. If any man despises me, that is his problem. My only concern is not doing or saying anything deserving of contempt.
33. The first rule is to keep an untroubled spirit. The second is to look things in the face and know them for what they are.
34. Never let the future disturb you. You will meet it, if you have to, with the same weapons of reason which today arm you against the present.
35. How much time he gains who does not look to see what his neighbour says or does or thinks, but only at what he does himself, to make it just and holy.
36. Very little is needed to make a happy life; it is all within yourself in your way of thinking.
37. Whenever you are about to find fault with someone, ask yourself the following question: What fault of mine most nearly resembles the one I am about to criticize?
38. If you are distressed by anything external, the pain is not due to the thing itself, but to your estimate of it; and this you have the power to revoke at any moment.
39. The happiness of your life depends upon the quality of your thoughts.
40. Everything we hear is an opinion, not a fact. Everything we see is a perspective, not the truth.
41. If someone is able to show me that what I think or do is not right, I will happily change, for I seek the truth, by which no one was ever truly harmed. It is the person who continues in his self-deception and ignorance who is harmed.
42. I have often wondered how it is that every man loves himself more than all the rest of men, but yet sets less value on his own opinion of himself than on the opinion of others.
43. Begin each day by telling yourself: Today I shall be meeting with interference, ingratitude, insolence, disloyalty, ill-will, and selfishness – all of them due to the offenders’ ignorance of what is good or evil.
44. Perfection of character is this: to live each day as if it were your last, without frenzy, without apathy, without pretence.
45. A person’s worth is measured by the worth of what he values.
46. Observe always that everything is the result of change, and get used to thinking that there is nothing Nature loves so well as to change existing forms and make new ones like them.
47. Or is it your reputation that’s bothering you? But look at how soon we’re all forgotten. The abyss of endless time that swallows it all. The emptiness of those applauding hands. The people who praise us; how capricious they are, how arbitrary. And the tiny region it takes place. The whole earth a point in space – and most of it uninhabited.
48. Be like the cliff against which the waves continually break; but it stands firm and tames the fury of the water around it.
49. A man must stand erect, not be kept erect by others.
50. We suffer more often in imagination than in reality.
51. If you really want to escape the things that harass you, what you’re needing is not to be in a different place but to be a different person.
52. Sometimes even to live is an act of courage.
53. Fire tests gold, suffering tests brave men.
54. Enjoy present pleasures in such a way as not to injure future ones.
55. They lose the day in expectation of the night, and the night in fear of the dawn.
56. It is not that we have so little time but that we lose so much. The life we receive is not short but we make it so; we are not ill provided but use what we have wastefully.
57. Luck is what happens when preparation meets opportunity.
58. The greatest obstacle to living is expectancy, which hangs upon tomorrow and loses today. You are arranging what lies in Fortune’s control, and abandoning what lies in yours. What are you looking at? To what goal are you straining? The whole future lies in uncertainty: live immediately.
59. If a man knows not to which port he sails, no wind is favorable.
60. Anger, if not restrained, is frequently more hurtful to us than the injury that provokes it.
61. True happiness is to enjoy the present, without anxious dependence upon the future, not to amuse ourselves with either hopes or fears but to rest satisfied with what we have, which is sufficient, for he that is so wants nothing.
62. The greatest blessings of mankind are within us and within our reach. A wise man is content with his lot, whatever it may be, without wishing for what he has not.
63. All cruelty springs from weakness.
64. Difficulties strengthen the mind, as labor does the body.
65. Withdraw into yourself, as far as you can. Associate with those who will make a better man of you. Welcome those whom you yourself can improve. The process is mutual; for men learn while they teach.
66. He who spares the wicked injures the good.
67. You act like mortals in all that you fear, and like immortals in all that you desire.
68. He suffers more than necessary, who suffers before it is necessary.
69. A gift consists not in what is done or given, but in the intention of the giver or doer.
70. People are frugal in guarding their personal property; but as soon as it comes to squandering time they are most wasteful of the one thing in which it is right to be stingy.
71. Every new beginning comes from some other beginning’s end.
72. To win true freedom you must be a slave to philosophy.
73. It is a rough road that leads to the heights of greatness.
74. Often a very old man has no other proof of his long life than his age.
75. No man is crushed by misfortune unless he has first been deceived by prosperity.
76. Man conquers the world by conquering himself.
77. Better to trip with the feet than with the tongue.
78. Well-being is realized by small steps, but is truly no small thing.
79. Nothing is more hostile to a firm grasp on knowledge than self-deception.
80. The goal of life is living in agreement with Nature.
81. We have two ears and one mouth, so we should listen more than we say.
82. If you lay violent hands on me, you’ll have my body, but my mind will remain with Stilpo.
83. Happiness is a good flow of life.
84. A bad feeling is a commotion of the mind repugnant to reason, and against nature.
85. No loss should be more regrettable to us than losing our time, for it’s irretrievable.
86. Wealth is able to buy the pleasures of eating, drinking and other sensual pursuits-yet can never afford a cheerful spirit or freedom from sorrow.
87. In our control is the most beautiful and important thing, the thing because of which even the god himself is happy— namely, the proper use of our impressions. We must concern ourselves absolutely with the things that are under our control and entrust the things not in our control to the universe.
88. If you accomplish something good with hard work, the labor passes quickly, but the good endures; if you do something shameful in pursuit of pleasure, the pleasure passes quickly, but the shame endures.
89. Choose to die well while you can; wait too long, and it might become impossible to do so.
90. If we were to measure what is good by how much pleasure it brings, nothing would be better than self-control- if we were to measure what is to be avoided by its pain, nothing would be more painful than lack of self-control.
91. From good people you’ll learn good, but if you mingle with the bad you’ll destroy such soul as you had.
92. You will earn the respect of all if you begin by earning the respect of yourself. Don’t expect to encourage good deeds in people conscious of your own misdeeds.
93. Since every man dies, it is better to die with distinction than to live long.
94. To accept injury without a spirit of savage resentment-to show ourselves merciful toward those who wrong us-being a source of good hope to them-is characteristic of a benevolent and civilized way of life.
95. We will train both soul and body when we accustom ourselves to cold, heat, thirst, hunger, scarcity of food, hardness of bed, abstaining from pleasures, and enduring pains.
96. What good are gilded rooms or precious stones-fitted on the floor, inlaid in the walls, carried from great distances at the greatest expense? These things are pointless and unnecessary-without them isn’t it possible to live healthy? Aren’t they the source of constant trouble? Don’t they cost vast sums of money that, through public and private charity, may have benefited many?
97. Being good is the same as being a philosopher. If you obey your father, you will follow the will of a man; if you choose the philosopher’s life, the will of the universe. It is plain, therefore, that your duty lies in the pursuit of philosophy.
98. For mankind, evil is injustice and cruelty and indifference to a neighbour’s trouble, while virtue is brotherly love and goodness and justice and beneficence and concern for the welfare of your neighbour—with.
99. Husband and wife should come together to craft a shared life, procreating children, seeing all things as shared between them-with nothing withheld or private to one another-not even their bodies.
100. To accept injury without a spirit of savage resentment-to show ourselves merciful toward those who wrong us-being a source of good hope to them-is characteristic of a benevolent and civilized way of life.
"""

def extract_lines(text):
    lines = []
    for line in text.split('\n'):
        line = line.strip()
        if not line: continue
        # strip numbering
        line = re.sub(r'^\d+\.\s*', '', line)
        lines.append(line)
    return lines

reddit = extract_lines(reddit_raw)
legacy = extract_lines(legacy_raw)
camille = extract_lines(camille_raw)
stoic = extract_lines(stoic_raw)

# Generate final array content
new_arr = "const templatePrompts = [\n"

def append_section(title, items):
    global new_arr
    new_arr += f"    // {title}\n"
    for idx, item in enumerate(items):
        item_escaped = json.dumps(item)
        new_arr += f"    {item_escaped},\n"
    new_arr += "\n"

append_section("Original Prompts", original)
append_section("Prompts from Reddit (/r/Journaling)", reddit)
append_section("Decide Your Legacy Prompts", legacy)
append_section("Camille Styles Prompts", camille)
append_section("Stoicism Quotes", stoic)
append_section("Thich Nhat Hanh Prompts", tnh)

# remove trailing comma and newline for the last item correctly
new_arr = new_arr.rstrip(',\n') + "\n];"

# Read original app.js
with open(app_js_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace range
start_marker = "const templatePrompts = ["
end_marker = "];"
start_idx = content.find(start_marker)
# Find the end marker after start_idx
end_idx = content.find(end_marker, start_idx) + len(end_marker)

if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx] + new_arr + content[end_idx:]
    with open(app_js_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully updated app.js with all new prompts.")
else:
    print("Could not find templatePrompts block in app.js!")
