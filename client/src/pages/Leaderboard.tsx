import { useState, useEffect } from "react";
import type { GameKey, DateShow, LeaderboardFilter, LeaderboardPlayer } from "@gamenite/shared";
import { gameNames } from "../util/consts";
import LeaderboardTable from "../components/LeaderboardTable";
import { getLeaderboardList } from "../services/leaderboardService";
import useLoginContext from "../hooks/useLoginContext";
import useSocketsForFriends from "../hooks/useSocketsForFriends";

type WinRateSort = "rank" | "winRateAscending" | "winRateDescending";
type FriendFilter = "all" | "friends";

/**
 * The leaderboard page where users can see global and game specific leaderboard,
 * and filter based on various things
 * @returns The UI for the leaderboard
 */
export default function Leaderboard() {
  //keeps track of which date range was selected
  const [selectedDateShow, setSelectedDateShow] = useState<DateShow>("all");
  //keeps track of how user wants to sort the leaderboard
  const [winRateSort, setWinRateSort] = useState<WinRateSort>("rank");
  //keeps track of viewing friends only or all
  const [friendFilter, setFriendFilter] = useState<FriendFilter>("all");
  //keeps track of which leaderboard was selected
  const [selectedLeaderboard, setSelectedLeaderboard] = useState<LeaderboardFilter>("global");
  const [leaderboardRows, setLeaderboardRows] = useState<LeaderboardPlayer[]>([]);
  const { socket, user } = useLoginContext();
  const { friends } = useSocketsForFriends();
  const friendUsernames = new Set(friends.map((friend) => friend.username));

  let leaderboardTitle = "Global Leaderboard";

  //checks whether the selected leaderboard is game specific
  if (selectedLeaderboard !== "global") {
    leaderboardTitle = `${gameNames[selectedLeaderboard]} Leaderboard`;
  }

  //Gets the win rate from the players total wins and games played
  function getWinRate(player: LeaderboardPlayer) {
    if (player.totalGames === 0) {
      return 0;
    }

    return player.totalWins / player.totalGames;
  }

  //only keeps the rows that match the selected friend filter, then sorts the visible rows
  const visibleLeaderboardRows = leaderboardRows
    //shows all players when filter is all, otherwise only friends
    .filter((player) => friendFilter === "all" || friendUsernames.has(player.user.username))
    .sort((a, b) => {
      //sort lowest to highest win rate
      if (winRateSort === "winRateAscending") {
        return getWinRate(a) - getWinRate(b);
      }

      //sort highest to lowest win rate
      if (winRateSort === "winRateDescending") {
        return getWinRate(b) - getWinRate(a);
      }

      //if no win rate sort is selected, then just default
      return a.rank - b.rank;
    });

  useEffect(() => {
    // prevents setting state after this effect is cleaned up
    // false if request is current, true if it's old
    let ignore = false;

    //runs once immediately when the page loads or the selected leaderboard/time range changes
    void getLeaderboardList({
      leaderboard: selectedLeaderboard,
      dateShow: selectedDateShow,
    }) // gets leaderboard rows directly in the effect
      .then((rows) => {
        if (!ignore) {
          // only updates state if this effect is still current
          setLeaderboardRows(rows);
        }
      })
      .catch(() => {
        if (!ignore) {
          // only clears rows if this effect is still current
          setLeaderboardRows([]);
        }
      });

    return () => {
      // marks old request results as ignored when selectedLeaderboard or selectedDateShow changes
      ignore = true;
    };
  }, [selectedLeaderboard, selectedDateShow]); // refetches rows when the leaderboard/time changes

  useEffect(() => {
    function handleLeaderboardUpdated(payload: { gameType: GameKey }) {
      // handles leaderboard update socket events
      if (selectedLeaderboard === "global" || selectedLeaderboard === payload.gameType) {
        // refetches the leaderboard when a matching game ends
        void getLeaderboardList({
          leaderboard: selectedLeaderboard,
          dateShow: selectedDateShow,
        })
          .then((rows) => {
            // updates the table with the newest leaderboard rows from the server
            setLeaderboardRows(rows);
          })
          .catch(() => {
            // clears the table if the leaderboard refetch fails
            setLeaderboardRows([]);
          });
      }
    }

    // listens for leaderboard updates from the server
    socket.on("leaderboardUpdated", handleLeaderboardUpdated);

    return () => {
      socket.off("leaderboardUpdated", handleLeaderboardUpdated);
    };
  }, [socket, selectedLeaderboard, selectedDateShow]);

  return (
    <div>
      <div className="leaderboardFilters">
        <div className="leaderboardFilterGroup">
          <label htmlFor="leaderboardFilter">Choose Leaderboard</label>{" "}
          {/* adds a label for the leaderboard dropdown */}
          <select
            id="leaderboardFilter"
            value={selectedLeaderboard}
            onChange={(event) => setSelectedLeaderboard(event.target.value as LeaderboardFilter)}
          >
            <option value="global">Global</option>

            {/* creates dropdown for each game */}
            {Object.entries(gameNames).map(([gameKey, gameName]) => (
              <option key={gameKey} value={gameKey}>
                {gameName}
              </option>
            ))}
          </select>
        </div>

        <div className="leaderboardFilterGroup">
          {/* adds a dropdown for different time ranges */}
          <label htmlFor="dateFilter">Time Range</label>{" "}
          <select
            id="dateFilter"
            value={selectedDateShow}
            onChange={(event) => setSelectedDateShow(event.target.value as DateShow)}
          >
            <option value="all">All Time</option>
            <option value="weekly">Weekly</option>
            <option value="daily">Daily</option>
          </select>
        </div>

        <div className="leaderboardFilterGroup">
          {/* adds a drop down for what to sort by */}
          <label htmlFor="winRateSort">Sort</label>{" "}
          <select
            id="winRateSort"
            value={winRateSort}
            onChange={(event) => setWinRateSort(event.target.value as WinRateSort)}
          >
            <option value="rank">Rank</option>
            <option value="winRateDescending">Win Rate High to Low</option>
            <option value="winRateAscending">Win Rate Low to High</option>
          </select>
        </div>

        <div className="leaderboardFilterGroup">
          {/* adds a drop down for whether to sort by friends or not */}
          <label htmlFor="friendFilter">Show</label>
          <select
            id="friendFilter"
            value={friendFilter}
            onChange={(event) => setFriendFilter(event.target.value as FriendFilter)}
          >
            <option value="all">Everyone</option>
            <option value="friends">Friends Only</option>
          </select>
        </div>
      </div>

      <LeaderboardTable
        title={leaderboardTitle}
        rows={visibleLeaderboardRows}
        currentUsername={user.username}
      />
    </div>
  );
}
