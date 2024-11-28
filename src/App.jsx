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

import { firebaseConfig } from "./firebase.js";

import "./App.css";
import { FcGoogle } from "react-icons/fc";

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const auth = getAuth(app);

function App() {
  const [user] = useAuthState(auth);

  return (
    <>
      <div className="App bg-gray-100 ">
        <div className="navbar bg-slate-700 drop-shadow-md text-white fixed w-full z-10">
          <div className="flex-1">
            <button
              className="btn btn-ghost text-xl"
              onClick={() => document.getElementById("my_modal_2").showModal()}
            >
              💬Chatroom
            </button>
          </div>
          <div className="navbar-end">
            <SignOut />
          </div>
        </div>

        {/* MODAL STUFF */}
        <dialog id="my_modal_2" className="modal">
          <div className="modal-box">
            <h3 className="font-bold text-lg">💬Chatroom</h3>
            <p className="py-4">
              A Final Project for 3101 Platform Technologies
            </p>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button>close</button>
          </form>
        </dialog>

        <section>
          {user ? (
            <ChatRoom />
          ) : (
            <div className="hero bg-base-200 min-h-screen">
              <div className="hero-content text-center">
                <div className="max-w-md">
                  <h1 className="text-5xl font-bold">Hello there 👋🏻</h1>
                  <p className="py-6">
                    Welcome to Chatroom! Sign in to start, meet new people, and
                    make connections in one shared room
                  </p>
                  <SignIn />
                </div>
              </div>
            </div>
          )}
        </section>
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

  return (
    <button
      className="btn btn-outline btn-primary text-base"
      onClick={signInWithGoogle}
    >
      <FcGoogle size={20} />
      Sign in with Google
    </button>
  );
}

function SignOut() {
  return (
    auth.currentUser && (
      <button
        className="btn btn-outline btn-error"
        onClick={() => auth.signOut()}
      >
        Sign Out
      </button>
    )
  );
}

function ChatRoom() {
  const dummy = useRef(null);
  const messageRef = collection(firestore, "messages");

  const [lastVisible, setLastVisible] = useState(null); // To track pagination
  const [messagesSnapshot, setMessagesSnapshot] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formValue, setFormValue] = useState("");

  useEffect(() => {
    const firstQuery = query(
      messageRef,
      orderBy("createdAt", "desc"),
      limit(25)
    );

    const unsubscribe = onSnapshot(firstQuery, (snapshot) => {
      if (!snapshot.empty) {
        setMessagesSnapshot(snapshot.docs.reverse());
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setLoading(false);
      } else {
        console.log("No messages found.");
      }

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
      limit(15)
    );

    setLoading(true);

    onSnapshot(nextQuery, (snapshot) => {
      if (!snapshot.empty) {
        setMessagesSnapshot((prevMessages) => [
          ...snapshot.docs.reverse(),
          ...prevMessages,
        ]);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      } else {
        console.log("No more messages.");
      }
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
      <div
        className="pt-16 pb-20 overflow-y-auto h-screen lg:pl-60 lg:pr-60 md:pl-28 md:pr-28"
        onScroll={(e) => {
          if (e.target.scrollTop === 0) {
            loadMoreMessages();
          }
        }}
      >
        <main>
          {messagesSnapshot &&
            messagesSnapshot.map((doc) => (
              <ChatMessage key={doc.id} message={doc.data()} />
            ))}
          <div ref={dummy}></div>
        </main>

        <form
          className="fixed bottom-0 left-0 w-full bg-white shadow-md p-4 flex justify-center items-center gap-2"
          onSubmit={sendMessage}
        >
          <input
            className="input input-bordered flex-grow max-w-lg"
            value={formValue}
            onChange={(e) => setFormValue(e.target.value)}
            placeholder="Type a message"
          />
          <button
            className="btn btn-primary"
            type="submit"
            disabled={!formValue}
          >
            Send
          </button>
        </form>
      </div>
    </>
  );
}

function ChatMessage(props) {
  const { text, uid, photoURL, createdAt } = props.message;
  const messageClass =
    uid === auth.currentUser.uid ? "chat chat-end" : "chat chat-start";

  return (
    <div className={`message ${messageClass}`}>
      <div className="chat-image avatar">
        <div className="w-10 rounded-full">
          <img
            src={
              photoURL ||
              "https://api.adorable.io/avatars/23/abott@adorable.png"
            }
            alt="avatar"
          />
        </div>
      </div>

      <div className="chat-bubble">{text}</div>
      <div className="chat-footer opacity-50 text-xs">
        {new Date(createdAt?.seconds * 1000).toLocaleString()}
      </div>
    </div>
  );
}

export default App;
