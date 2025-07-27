import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Firebase Config ---
const firebaseConfig = {
    apiKey: "AIzaSyDPT9lgYfkXyvuYaYPTrycmpEjA1fChYkw",
    authDomain: "mit-ai-chatbot.firebaseapp.com",
    projectId: "mit-ai-chatbot",
    storageBucket: "mit-ai-chatbot.firebasestorage.app",
    messagingSenderId: "562597392469",
    appId: "1:562597392469:web:5719cbb3be771af63e24dc",
    measurementId: "G-KVX5EHHRPC"
};

// --- DOM Elements ---
const dom = {
    characterArt: document.querySelector('.character-art'),
    registerBtn: document.getElementById('register-btn'),
    chatbotSection: document.getElementById('chatbot-section'),
    chatWindow: document.getElementById('chat-window'),
    userInput: document.getElementById('user-input'),
    submitButton: document.getElementById('send-btn'), // Changed to ID
};

// --- App State ---
let state = {
    conversation: 'intro',
    userData: {},
    isWaiting: true,
    db: null,
    auth: null,
    userId: null,
    appId: typeof __app_id !== 'undefined' ? __app_id : 'ai-im-bot-standalone',
    messageTimestamps: [], // For rate limiting
};

// --- Initializers ---
async function init() {
    initParallax();
    initSmoothScroll();
    initChatHandlers(); // New function to set up chat listeners
    await initFirebase();
}

function initParallax() {
    const art = dom.characterArt;
    if (!art) return;
    document.body.addEventListener('mousemove', (e) => {
        const { clientX, clientY } = e;
        const { innerWidth, innerHeight } = window;
        const moveX = ((clientX / innerWidth) - 0.5) * 30; // Multiplier controls sensitivity
        const moveY = ((clientY / innerHeight) - 0.5) * 20;
        art.style.transform = `translate(${moveX}px, ${moveY}px)`;
    });
}

function initSmoothScroll() {
    dom.registerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        dom.chatbotSection.scrollIntoView({ behavior: 'smooth' });
    });
}

// BUG FIX: Separated event listeners from form submission
function initChatHandlers() {
    dom.submitButton.addEventListener('click', handleUserInput);
    dom.userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent default form submission on Enter
            handleUserInput(e);
        }
    });
}

async function initFirebase() {
    try {
        const app = initializeApp(firebaseConfig);
        state.db = getFirestore(app);
        state.auth = getAuth(app);
        
        onAuthStateChanged(state.auth, (user) => {
            if (user) {
                state.userId = user.uid;
                if (state.conversation === 'intro') {
                    startConversation();
                    state.conversation = 'asking_name';
                }
            } else {
                signInAnonymously(state.auth).catch(err => {
                    console.error("Sign-in failed:", err);
                    displayMessage("Error: Could not connect to the authentication service. Please ensure Anonymous sign-in is enabled in your Firebase project.", 'bot', 'error');
                    toggleInput(true, "Connection failed.");
                });
            }
        });
    } catch (error) {
        console.error("Firebase init failed:", error);
        displayMessage("Error: Could not initialize the application.", 'bot', 'error');
    }
}

// --- Chat UI & Logic ---
function displayMessage(text, sender, type = 'text') {
    const wrapper = document.createElement('div');
    wrapper.className = `flex w-full ${sender === 'user' ? 'justify-end' : 'justify-start'}`;
    
    if (type === 'loading') {
        wrapper.id = 'loading-indicator';
        wrapper.innerHTML = `<div class="chat-bubble bot-bubble loading-bubble"><div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div></div>`;
    } else {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${sender === 'user' ? 'user-bubble' : 'bot-bubble'}`;
        if (type === 'html') bubble.innerHTML = text;
        else bubble.textContent = text;
        if (type === 'error') bubble.classList.add('!bg-red-600', '!text-white');
        wrapper.appendChild(bubble);
    }
    dom.chatWindow.appendChild(wrapper);
    dom.chatWindow.scrollTop = dom.chatWindow.scrollHeight;
}

function toggleInput(disabled, placeholder = "Type your message...") {
    dom.userInput.disabled = disabled;
    dom.submitButton.disabled = disabled;
    state.isWaiting = disabled;
    dom.userInput.placeholder = disabled ? "Please wait..." : placeholder;
    if (!disabled) dom.userInput.focus();
}

function startConversation() {
    setTimeout(() => {
        displayMessage("Hi I am here to help you to get started, just send me your name", 'bot');
        toggleInput(false);
    }, 500);
}

async function handleUserInput(e) {
    e.preventDefault(); // Extra precaution

    // --- NEW: Rate Limiting Logic ---
    const now = Date.now();
    const limit = 5; // Max 5 messages
    const period = 10000; // in 10 seconds

    // Filter out timestamps older than the period
    state.messageTimestamps = state.messageTimestamps.filter(ts => now - ts < period);

    if (state.messageTimestamps.length >= limit) {
        displayMessage("You're sending messages too quickly. Please wait a moment.", 'bot', 'error');
        // Temporarily disable input
        toggleInput(true, "Rate limited. Please wait...");
        setTimeout(() => {
            // Re-enable after a delay, only if the conversation isn't finished
            if (state.conversation !== 'finished_submitted' && state.conversation !== 'finished_rejected') {
                 toggleInput(false);
            }
        }, 15000); // 15-second cooldown
        return;
    }
    
    const text = dom.userInput.value.trim();
    if (!text || state.isWaiting) return;

    state.messageTimestamps.push(now); // Log timestamp after check passes

    displayMessage(text, 'user');
    dom.userInput.value = '';
    toggleInput(true);
    displayMessage('', 'bot', 'loading');
    
    const nextStep = conversationFlow[state.conversation];
    if (nextStep) {
        await nextStep(text);
    } else {
        document.getElementById('loading-indicator')?.remove();
        toggleInput(false);
    }
}

// --- AI-Powered Input Handler ---
async function callIntelligentHandler(text, question, schema) {
    // --- FIX: PASTE YOUR NEW GOOGLE CLOUD API KEY HERE ---
    const apiKey = "AIzaSyCHdofyrVL05xv_mERQus5ferigs8YLETs"; 
    
    if (apiKey === "PASTE_YOUR_GOOGLE_CLOUD_API_KEY_HERE") {
        displayMessage("Configuration Error: The Google Cloud API key is missing from script.js. Please follow the setup instructions.", 'bot', 'error');
        document.getElementById('loading-indicator')?.remove();
        toggleInput(true, "Configuration error.");
        return { status: 'off_topic', response: "" };
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const systemPrompt = `You are an intelligent assistant helping a user fill out an application for an AI interest group called "AI @ IM". The group is for students of the Department of Industrial Management at the University of Kelaniya. Your tone is friendly, encouraging, and slightly playful.

The user was just asked: "${question}"
The user responded with: "${text}"

Your task is to analyze the user's response.
1. First, determine the user's intent. Is the user trying to answer the question, or are they asking a different question or making an off-topic comment?
2. If the user is trying to answer, extract the information based on the provided schema.
3. If the user is asking a question or is off-topic, generate a brief, friendly response that answers their query (if possible) and then creatively guides them back to the original question.

Respond with ONLY a JSON object.`;

    const payload = {
        contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    "status": { "type": "STRING", "enum": ["answered", "off_topic"] },
                    "data": schema,
                    "response": { "type": "STRING", "description": "Your friendly, guiding response. Required if status is 'off_topic'." }
                },
                required: ["status"]
            }
        }
    };

    try {
        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`API call failed with status: ${response.status}. ${await response.text()}`);
        const result = await response.json();
        if (result.candidates && result.candidates.length > 0) {
            return JSON.parse(result.candidates[0].content.parts[0].text);
        }
        return { status: 'off_topic', response: "I'm sorry, I had a bit of trouble understanding that. Could you try rephrasing?" };
    } catch (error) {
        // DEBUGGING: Log the full error to the console
        console.error("Intelligent Handler Error:", error);
        return { status: 'off_topic', response: "I seem to be having a technical issue. Please try that again." };
    }
}

// --- REFACTORED: Conversation Flow with AI ---
const conversationFlow = {
    'asking_name': async (text) => {
        const question = "What's your full name?";
        const schema = { type: "OBJECT", properties: { "name": { "type": "STRING" } } };
        const result = await callIntelligentHandler(text, question, schema);
        document.getElementById('loading-indicator')?.remove();

        if (result.status === 'answered' && result.data.name) {
            state.userData.name = result.data.name;
            state.conversation = 'asking_gender';
            displayMessage(`Got it, ${state.userData.name}. Are you male or female?`, 'bot');
            toggleInput(false);
        } else if (result.response) {
            displayMessage(result.response, 'bot');
            toggleInput(false);
        }
    },
    'asking_gender': async (text) => {
        const question = "Are you male or female?";
        const schema = { type: "OBJECT", properties: { "gender": { "type": "STRING" } } };
        const result = await callIntelligentHandler(text, question, schema);
        document.getElementById('loading-indicator')?.remove();

        if (result.status === 'answered' && result.data.gender) {
            state.userData.gender = result.data.gender;
            state.conversation = 'asking_department';
            displayMessage("Thanks! Now, are you a student at the Department of Industrial Management, University of Kelaniya? (Yes/No)", 'bot');
            toggleInput(false);
        } else if (result.response) {
            displayMessage(result.response, 'bot');
            toggleInput(false);
        }
    },
    'asking_department': async (text) => {
         const question = "Are you a student at the Department of Industrial Management, University of Kelaniya? (Yes/No)";
         const schema = { type: "OBJECT", properties: { "answer": { "type": "STRING" } } };
         const result = await callIntelligentHandler(text, question, schema);
         document.getElementById('loading-indicator')?.remove();

        if (result.status === 'answered' && result.data.answer) {
            if (result.data.answer.toLowerCase().includes('yes')) {
                state.userData.isStudent = 'Yes';
                state.conversation = 'asking_student_id';
                displayMessage("Awesome, glad to have you! What is your student ID number?", 'bot');
                toggleInput(false);
            } else {
                state.conversation = 'finished_rejected';
                displayMessage("Ah, I see. This group is currently exclusive to students of the Department of Industrial Management. Thank you for your interest!", 'bot');
                toggleInput(true, "Application process ended.");
            }
        } else if (result.response) {
             displayMessage(result.response, 'bot');
             toggleInput(false);
        }
    },
    'asking_student_id': async (text) => {
        const question = "What is your student ID number?";
        const schema = { type: "OBJECT", properties: { "id": { "type": "STRING" } } };
        const result = await callIntelligentHandler(text, question, schema);
        document.getElementById('loading-indicator')?.remove();

        if (result.status === 'answered' && result.data.id) {
            state.userData.studentId = result.data.id;
            state.conversation = 'asking_whatsapp';
            displayMessage("Thanks. What's a WhatsApp number we can use to contact you?", 'bot');
            toggleInput(false);
        } else if (result.response) {
            displayMessage(result.response, 'bot');
            toggleInput(false);
        }
    },
    'asking_whatsapp': async (text) => {
        const question = "What's your WhatsApp number?";
        const schema = { type: "OBJECT", properties: { "phone": { "type": "STRING" } } };
        const result = await callIntelligentHandler(text, question, schema);
        document.getElementById('loading-indicator')?.remove();

        if (result.status === 'answered' && result.data.phone) {
            state.userData.whatsapp = result.data.phone;
            state.conversation = 'asking_email';
            displayMessage("And finally for contact info, what's your email address?", 'bot');
            toggleInput(false);
        } else if (result.response) {
            displayMessage(result.response, 'bot');
            toggleInput(false);
        }
    },
    'asking_email': async (text) => {
        const question = "What's your email address?";
        const schema = { type: "OBJECT", properties: { "email": { "type": "STRING" } } };
        const result = await callIntelligentHandler(text, question, schema);
        document.getElementById('loading-indicator')?.remove();

        if (result.status === 'answered' && result.data.email && result.data.email.includes('@')) {
            state.userData.email = result.data.email;
            state.conversation = 'asking_q1';
            displayMessage("Perfect. Now for the fun part! I have a few questions to understand your interests.", 'bot');
            setTimeout(() => {
                displayMessage("1. What’s something technical (even small) you’ve taught yourself recently?", 'bot');
                toggleInput(false);
            }, 1500);
        } else if (result.response) {
            displayMessage(result.response, 'bot');
            toggleInput(false);
        }
    },
    'asking_q1': async (text) => {
        const question = "What’s something technical (even small) you’ve taught yourself recently?";
        const schema = { type: "OBJECT", properties: { "answer": { "type": "STRING" } } };
        const result = await callIntelligentHandler(text, question, schema);
        document.getElementById('loading-indicator')?.remove();

        if (result.status === 'answered' && result.data.answer) {
            state.userData.q1 = result.data.answer;
            state.conversation = 'asking_q2';
            displayMessage("Interesting! Now for question 2: Have you ever built anything with code, no matter how simple? If yes, tell us about it.", 'bot');
            toggleInput(false);
        } else if (result.response) {
            displayMessage(result.response, 'bot');
            toggleInput(false);
        }
    },
    'asking_q2': async (text) => {
        const question = "Have you ever built anything with code? If yes, tell us about it.";
        const schema = { type: "OBJECT", properties: { "answer": { "type": "STRING" } } };
        const result = await callIntelligentHandler(text, question, schema);
        document.getElementById('loading-indicator')?.remove();

        if (result.status === 'answered' && result.data.answer) {
            state.userData.q2 = result.data.answer;
            state.conversation = 'asking_q3';
            displayMessage("Cool! Next, rate your AI knowledge on a scale from “I’m just curious” to “I read research papers for fun.”", 'bot');
            toggleInput(false);
        } else if (result.response) {
            displayMessage(result.response, 'bot');
            toggleInput(false);
        }
    },
    'asking_q3': async (text) => {
        const question = "Rate your AI knowledge on a scale from 'I’m just curious' to 'I read research papers for fun.'";
        const schema = { type: "OBJECT", properties: { "answer": { "type": "STRING" } } };
        const result = await callIntelligentHandler(text, question, schema);
        document.getElementById('loading-indicator')?.remove();

        if (result.status === 'answered' && result.data.answer) {
            state.userData.q3 = result.data.answer;
            state.conversation = 'asking_q4';
            displayMessage("Got it. What areas are you most excited to explore in AI? (e.g., Machine Learning, Robotics, NLP, etc.)", 'bot');
            toggleInput(false);
        } else if (result.response) {
            displayMessage(result.response, 'bot');
            toggleInput(false);
        }
    },
    'asking_q4': async (text) => {
        const question = "What areas are you most excited to explore in AI?";
        const schema = { type: "OBJECT", properties: { "answer": { "type": "STRING" } } };
        const result = await callIntelligentHandler(text, question, schema);
        document.getElementById('loading-indicator')?.remove();

        if (result.status === 'answered' && result.data.answer) {
            state.userData.q4 = result.data.answer;
            state.conversation = 'asking_q5';
            displayMessage("Love that! Last question: If you’re joining us, what would you love to contribute or lead?", 'bot');
            toggleInput(false);
        } else if (result.response) {
            displayMessage(result.response, 'bot');
            toggleInput(false);
        }
    },
    'asking_q5': async (text) => {
        const question = "What would you love to contribute or lead in the group?";
        const schema = { type: "OBJECT", properties: { "answer": { "type": "STRING" } } };
        const result = await callIntelligentHandler(text, question, schema);
        document.getElementById('loading-indicator')?.remove();

        if (result.status === 'answered' && result.data.answer) {
            state.userData.q5 = result.data.answer;
            state.conversation = 'awaiting_confirmation';
            displayConfirmation();
            toggleInput(true, "Please confirm or start over.");
        } else if (result.response) {
            displayMessage(result.response, 'bot');
            toggleInput(false);
        }
    }
};

function displayConfirmation() {
    const { name, gender, studentId, whatsapp, email, q1, q2, q3, q4, q5 } = state.userData;
    const confirmationHtml = `
        <p class="mb-3 font-medium">Please review your application:</p>
        <div class="space-y-3 p-4 bg-[#2e2a52]/60 rounded-lg text-slate-300 text-sm">
            <p><strong>Name:</strong> ${name || 'N/A'}</p>
            <p><strong>Gender:</strong> ${gender || 'N/A'}</p>
            <p><strong>Student ID:</strong> ${studentId || 'N/A'}</p>
            <p><strong>WhatsApp:</strong> ${whatsapp || 'N/A'}</p>
            <p><strong>Email:</strong> ${email || 'N/A'}</p>
            <p class="mt-2 pt-2 border-t border-[#4a456a]"><strong>Taught yourself:</strong> ${q1 || 'N/A'}</p>
            <p><strong>Coding experience:</strong> ${q2 || 'N/A'}</p>
            <p><strong>AI Knowledge:</strong> ${q3 || 'N/A'}</p>
            <p><strong>AI Interests:</strong> ${q4 || 'N/A'}</p>
            <p><strong>Contribution ideas:</strong> ${q5 || 'N/A'}</p>
        </div>
        <p class="my-3">Does this look correct?</p>
        <div class="flex gap-3">
            <div id="confirm-btn" class="confirmation-button">Confirm & Submit</div>
            <div id="cancel-btn" class="confirmation-button secondary">Start Over</div>
        </div>
    `;
    displayMessage(confirmationHtml, 'bot', 'html');
    
    document.getElementById('confirm-btn').addEventListener('click', handleConfirmation);
    document.getElementById('cancel-btn').addEventListener('click', handleCancellation);
}

async function handleConfirmation() {
    displayMessage("Confirm & Submit", 'user');
    toggleInput(true, "Submitting...");
    displayMessage('', 'bot', 'loading');
    await saveApplicationToFirestore();
    document.getElementById('loading-indicator')?.remove();
    state.conversation = 'finished_submitted';
    displayMessage("Thank you! Your application has been submitted successfully. We'll be in touch soon.", 'bot');
    toggleInput(true, "Application submitted!");
}

function handleCancellation() {
    displayMessage("Start Over", 'user');
    state.userData = {};
    state.conversation = 'intro';
    dom.chatWindow.innerHTML = ''; // Clear the chat window
    startConversation();
    state.conversation = 'asking_name';
}

async function saveApplicationToFirestore() {
    if (!state.db) {
        console.error("Firestore is not initialized.");
        return;
    }
    try {
        const collectionPath = `/artifacts/${state.appId}/public/data/applications`;
        await addDoc(collection(state.db, collectionPath), {
            ...state.userData,
            submittedAt: serverTimestamp(),
            submitterId: state.userId
        });
        console.log("Application saved successfully.");
    } catch (error) {
        console.error("Error adding document: ", error);
        displayMessage("There was an error saving your application. Please try again.", 'bot', 'error');
    }
}

// --- Start Everything ---
init();
