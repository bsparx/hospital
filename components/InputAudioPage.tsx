"use client";

import { useActionState, useRef } from "react";
import { pullAllTheFacts, transcribeAudio } from "../utils/actions";
import { Loader } from "lucide-react";





export default function InputAudioPage() {
  const initialState = {
    message: "",
    transcription: "",
  };

  const [state, formAction, isPending] = useActionState(transcribeAudio, initialState);
  const [state2, formAction2, isPending2] = useActionState(pullAllTheFacts, initialState, {
    transcript: state.transcription
  });
  const formRef = useRef(null);

  return (
    <div className="bg-gray-50">

      <main className="flex flex-col items-center justify-center min-h-screen ">
        <div className="w-full max-w-2xl p-8 space-y-6 bg-white border border-gray-200 rounded-xl shadow-md">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800">
              Doctor-Patient Conversation Transcriber
            </h1>
            <p className="mt-2 text-gray-600">
              Upload an MP3 audio file to get a formatted transcription.
            </p>
          </div>

          <form
            ref={formRef}
            action={formAction}
            className="space-y-4"
          >
            <div>
              <label htmlFor="audio" className="sr-only">Choose file</label>
              <input
                type="file"
                name="audio"
                id="audio"
                accept=".mp3"
                required
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:bg-blue-300"
            >
              {!isPending ? "Transcribe Audio" : <div className="flex flex-row"><Loader className="animate-spin mr-5" />Processing your audio</div>}
            </button>
          </form>

          {state?.message && (
            <p className={`text-sm ${state.transcription ? 'text-green-600' : 'text-red-500'}`}>
              {state.message}
            </p>
          )}

          {state?.transcription && (
            <form action={formAction2}>

              <div className="p-4 mt-4 bg-gray-100 border border-gray-300 rounded-lg">
                <h2 className="text-xl font-semibold text-gray-800">Transcription Result:</h2>
                <pre className="mt-2 text-gray-700 whitespace-pre-wrap font-mono">
                  {state.transcription}
                </pre>
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 mt-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:bg-blue-300"
              >
                {!isPending2 ? "Create Report" : <div className="flex flex-row"><Loader className="animate-spin mr-5" />Generating Report</div>}
                <input type="text" value={state.transcription} name='transcript' className="hidden" readOnly />
              </button>
            </form>
          )}
        </div>

      </main>

      {state2?.factData?.facts && (
        state2.factData?.facts.map((facts, index) => {
          return (
            <div className="flex flex-col text-black">
              <div>
                Fact number:{index + 1}
                <div>
                  {facts.role}
                </div>
                <div>
                  {facts.verbatimSentenceUsed}
                </div>
                <div>
                  {facts.fact}
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  );
}