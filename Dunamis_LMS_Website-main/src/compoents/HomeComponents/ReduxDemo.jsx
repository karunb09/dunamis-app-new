"use client";

import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { decrement, increment } from "@/store/counterSlice";
import { fetchPosts } from "@/store/postsSlice";

export default function ReduxDemo() {
    const dispatch = useDispatch();
    const count = useSelector((state) => state.counter.value);
    const { posts, loading, error } = useSelector((state) => state.posts);

    useEffect(() => {
        dispatch(fetchPosts());
    }, [dispatch]);

    return (
        <div style={{ padding: "20px" }}>
            <h2>Redux Counter: {count}</h2>
            <button onClick={() => dispatch(increment())}>+1</button>
            <button onClick={() => dispatch(decrement())}>-1</button>

            <h2>Posts from API:</h2>
            {loading && <p>Loading...</p>}
            {error && <p style={{ color: "red" }}>Error: {error}</p>}
            <ul>
                {posts.slice(0, 5).map((post) => (
                    <li key={post.id}>{post.title}</li>
                ))}
            </ul>
        </div>
    );
}
