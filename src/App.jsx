import { useState, useRef, useEffect } from "react";

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  serverTimestamp,
  addDoc,
  startAfter,
  onSnapshot,
} from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { useCollection } from "react-firebase-hooks/firestore";

import { firebaseConfig } from "./firebase.js";

import "./App.css";

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const auth = getAuth(app);

function App() {
  const [user] = useAuthState(auth);

  return (
    <>
      <div className="App">
        <header>
          <h1>⚛️🔥💬</h1>
          <SignOut />
        </header>

        <section>{user ? <ChatRoom /> : <SignIn />}</section>
      </div>
    </>
  );
}

function SignIn() {
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in:", error);
    }
  };

  return <button onClick={signInWithGoogle}>Sign in with Google</button>;
}

function SignOut() {
  return (
    auth.currentUser && <button onClick={() => auth.signOut()}>Sign Out</button>
  );
}

function ChatRoom() {
  const dummy = useRef(null);
  const messageRef = collection(firestore, "messages");

  const [lastVisible, setLastVisible] = useState(null); // To track pagination
  const [messagesSnapshot, setMessagesSnapshot] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formValue, setFormValue] = useState("");

  // Fetch the initial 25 messages
  useEffect(() => {
    const firstQuery = query(
      messageRef,
      orderBy("createdAt", "desc"),
      limit(25)
    );

    const unsubscribe = onSnapshot(firstQuery, (snapshot) => {
      setMessagesSnapshot(snapshot.docs.reverse());
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      setLoading(false);

      // Scroll to the bottom after messages are loaded
      setTimeout(() => {
        if (dummy.current) {
          dummy.current.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    });

    return () => unsubscribe();
  }, []);

  const loadMoreMessages = () => {
    if (loading || !lastVisible) return;

    const nextQuery = query(
      messageRef,
      orderBy("createdAt", "desc"),
      startAfter(lastVisible),
      limit(10)
    );

    setLoading(true);

    onSnapshot(nextQuery, (snapshot) => {
      setMessagesSnapshot((prevMessages) => [
        ...snapshot.docs.reverse(),
        ...prevMessages,
      ]);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      setLoading(false);
    });
  };

  const sendMessage = async (e) => {
    e.preventDefault();

    const { uid, photoURL } = auth.currentUser;

    try {
      await addDoc(messageRef, {
        text: formValue,
        createdAt: serverTimestamp(),
        uid,
        photoURL,
      });

      setFormValue("");

      // Scroll to the bottom after sending a message
      setTimeout(() => {
        if (dummy.current) {
          dummy.current.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <>
      <main
        onScroll={(e) => {
          if (e.target.scrollTop === 0) {
            loadMoreMessages();
          }
        }}
      >
        {messagesSnapshot &&
          messagesSnapshot.map((doc) => (
            <ChatMessage key={doc.id} message={doc.data()} />
          ))}
        <div ref={dummy}></div>
      </main>

      <form onSubmit={sendMessage}>
        <input
          value={formValue}
          onChange={(e) => setFormValue(e.target.value)}
          placeholder="Type a message"
        />
        <button type="submit" disabled={!formValue}>
          Send
        </button>
      </form>
    </>
  );
}

function ChatMessage(props) {
  const { text, uid, photoURL, createdAt } = props.message;
  const messageClass = uid === auth.currentUser.uid ? "sent" : "received";

  return (
    <div className={`message ${messageClass}`}>
      <img
        src={
          photoURL || "https://api.adorable.io/avatars/23/abott@adorable.png"
        }
        alt="avatar"
      />
      <p>{text}</p>
      <p>
        <small>
          Sent at: {new Date(createdAt?.seconds * 1000).toLocaleString()}
        </small>
      </p>
    </div>
  );
}

export default App;
