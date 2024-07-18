import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import PropTypes from "prop-types";

export function Sidebar({ children, asColumn = true, ...props }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: asColumn ? "column" : "row",
        alignItems: "flex-start",
        height: "100%",
        minHeight: "100%",
        minWidth: "400px",
        backgroundColor: "white",
        padding: 0,
        overflowY: "scroll",
        overflowX: "hidden",
        gap: 1,
        paddingRight: "20px",
        ...props,
      }}
    >
      {children}
    </Box>
  );
}

Sidebar.propTypes = {
  children: PropTypes.node,
  asColumn: PropTypes.bool,
};
